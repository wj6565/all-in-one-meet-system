#!/usr/bin/env python3
"""
올인원 파일 DB에서 계정 목록을 현재 시스템 DB로 마이그레이션
- Account: 관리자 계정 (admin001 유지, 올인원 admin 추가/동기화)
- Department: 올인원 부서 전부 upsert
- User: 올인원 User 전부 upsert (loginId 있는 사람만 로그인 가능)
"""
import sqlite3
import json
import os
from datetime import datetime

SOURCE_DB = '/home/user/analysis/allinone/webapp/dev.db'
TARGET_DB = '/home/user/webapp/dev.db'

def migrate():
    src = sqlite3.connect(SOURCE_DB)
    src.row_factory = sqlite3.Row
    tgt = sqlite3.connect(TARGET_DB)
    tgt.row_factory = sqlite3.Row

    now = datetime.utcnow().isoformat()

    # ── 1. Account (관리자) ──────────────────────────────────────
    print('\n[1/3] Account 마이그레이션...')
    src_accounts = src.execute('SELECT * FROM Account').fetchall()
    acc_ok = 0
    for a in src_accounts:
        # email 이 '21368' 같은 사번 형태인 경우 → wonjin 이메일로 변환
        email = a['email']
        if '@' not in email:
            email = f"{email}@wonjin.co.kr"
        
        existing = tgt.execute('SELECT id FROM Account WHERE email=?', (email,)).fetchone()
        if existing:
            tgt.execute(
                'UPDATE Account SET name=?, role=?, isActive=?, updatedAt=? WHERE email=?',
                (a['name'], a['role'], a['isActive'], now, email)
            )
        else:
            try:
                tgt.execute(
                    'INSERT INTO Account (id, email, password, name, role, isActive, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)',
                    (a['id'], email, a['password'], a['name'], a['role'], a['isActive'], now, now)
                )
            except Exception as e:
                # ID 충돌 시 새 ID 생성
                import uuid
                new_id = 'acc_' + uuid.uuid4().hex[:16]
                tgt.execute(
                    'INSERT INTO Account (id, email, password, name, role, isActive, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)',
                    (new_id, email, a['password'], a['name'], a['role'], a['isActive'], now, now)
                )
        acc_ok += 1
    tgt.commit()
    print(f'  ✅ Account: {acc_ok}개 처리')

    # ── 2. Department ────────────────────────────────────────────
    print('\n[2/3] Department 마이그레이션...')
    src_depts = src.execute('SELECT * FROM Department').fetchall()
    dept_id_map = {}  # src id → tgt id
    dept_ok = 0
    for d in src_depts:
        existing = tgt.execute('SELECT id FROM Department WHERE name=?', (d['name'],)).fetchone()
        if existing:
            dept_id_map[d['id']] = existing['id']
        else:
            try:
                tgt.execute(
                    'INSERT INTO Department (id, name, createdAt) VALUES (?,?,?)',
                    (d['id'], d['name'], now)
                )
                dept_id_map[d['id']] = d['id']
            except Exception:
                import uuid
                new_id = 'dept_' + uuid.uuid4().hex[:16]
                tgt.execute(
                    'INSERT INTO Department (id, name, createdAt) VALUES (?,?,?)',
                    (new_id, d['name'], now)
                )
                dept_id_map[d['id']] = new_id
        dept_ok += 1
    tgt.commit()
    print(f'  ✅ Department: {dept_ok}개 처리')

    # ── 3. User ──────────────────────────────────────────────────
    print('\n[3/3] User 마이그레이션...')
    src_users = src.execute('SELECT * FROM User').fetchall()
    user_ok = 0
    user_skip = 0
    for u in src_users:
        email = u['email']
        # 사번@wonjin.co.kr 형태 처리
        if not email or email.strip() == '':
            user_skip += 1
            continue

        dept_id = dept_id_map.get(u['departmentId']) if u['departmentId'] else None

        # loginId / loginPassword
        login_id = u['loginId']
        login_pw = u['loginPassword']

        # userType: role 필드가 'admin'이면 admin, 아니면 user
        user_type = 'admin' if u['role'] == 'admin' else 'user'

        existing_email = tgt.execute('SELECT id FROM User WHERE email=?', (email,)).fetchone()
        existing_login = tgt.execute('SELECT id FROM User WHERE loginId=?', (login_id,)).fetchone() if login_id else None

        if existing_email:
            # 이메일 기준으로 업데이트
            tgt.execute('''
                UPDATE User SET
                  name=?, departmentId=?, position=?,
                  loginId=?, loginPassword=?,
                  userType=?, isActive=?, updatedAt=?
                WHERE email=?
            ''', (
                u['name'], dept_id, u['position'],
                login_id, login_pw,
                user_type, u['isActive'], now,
                email
            ))
        elif existing_login:
            # loginId 충돌 → loginId 기준 업데이트
            tgt.execute('''
                UPDATE User SET
                  name=?, email=?, departmentId=?, position=?,
                  loginPassword=?, userType=?, isActive=?, updatedAt=?
                WHERE loginId=?
            ''', (
                u['name'], email, dept_id, u['position'],
                login_pw, user_type, u['isActive'], now,
                login_id
            ))
        else:
            try:
                tgt.execute('''
                    INSERT INTO User
                      (id, name, email, departmentId, position, loginId, loginPassword,
                       userType, isActive, createdAt, updatedAt)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?)
                ''', (
                    u['id'], u['name'], email, dept_id, u['position'],
                    login_id, login_pw,
                    user_type, u['isActive'], now, now
                ))
            except Exception as e:
                import uuid
                new_id = 'usr_' + uuid.uuid4().hex[:16]
                try:
                    tgt.execute('''
                        INSERT INTO User
                          (id, name, email, departmentId, position, loginId, loginPassword,
                           userType, isActive, createdAt, updatedAt)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?)
                    ''', (
                        new_id, u['name'], email, dept_id, u['position'],
                        login_id, login_pw,
                        user_type, u['isActive'], now, now
                    ))
                except Exception as e2:
                    print(f'  ⚠️  건너뜀: {u["name"]} ({email}) - {e2}')
                    user_skip += 1
                    continue
        user_ok += 1

    tgt.commit()
    print(f'  ✅ User: {user_ok}개 처리, {user_skip}개 건너뜀')

    # ── 결과 요약 ────────────────────────────────────────────────
    print('\n═══════════════════════════════')
    print('마이그레이션 완료!')
    total_acc = tgt.execute('SELECT COUNT(*) as c FROM Account').fetchone()['c']
    total_dept = tgt.execute('SELECT COUNT(*) as c FROM Department').fetchone()['c']
    total_user = tgt.execute('SELECT COUNT(*) as c FROM User').fetchone()['c']
    active_user = tgt.execute("SELECT COUNT(*) as c FROM User WHERE isActive=1 AND loginId IS NOT NULL").fetchone()['c']
    print(f'  Account    : {total_acc}개')
    print(f'  Department : {total_dept}개')
    print(f'  User 전체  : {total_user}개')
    print(f'  로그인가능 : {active_user}명 (isActive=1 & loginId 존재)')
    print('═══════════════════════════════')

    src.close()
    tgt.close()

if __name__ == '__main__':
    migrate()
