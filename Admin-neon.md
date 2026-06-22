# Magisterium Admin Database Queries

## Phase B persistence additions

The backend now creates and manages:

- `schema_migrations`
- `auth_sessions.expires_at`
- `characters.version`
- `battles`

Useful checks:

```sql
SELECT id, applied_at
FROM schema_migrations
ORDER BY id;
```

```sql
SELECT
  id AS battle_id,
  owner_user_id,
  character_id,
  status,
  updated_at,
  expires_at
FROM battles
ORDER BY updated_at DESC;
```

Do not manually edit `characters.version` independently from
`characters.data->>'version'`.

Ghi chú: chạy các câu lệnh này trong Neon SQL Editor hoặc pgAdmin đang kết nối đúng Neon database của Render backend.

Không SELECT password_hash / password_salt nếu không cần.

---

#1. Kiểm tra mình đang kết nối đúng database nào

Công dụng: xác nhận pgAdmin/Neon SQL Editor đang trỏ đúng database mà backend đang dùng.

```sql
SELECT
  current_database() AS database_name,
  current_user AS database_user,
  inet_server_addr() AS server_address,
  inet_server_port() AS server_port;
```

---

#2. Xem toàn bộ account người chơi

Công dụng: xem user id, username, email, role và thời điểm đăng ký.

```sql
SELECT
  id AS user_id,
  username,
  email,
  role,
  created_at AS registered_at
FROM auth_users
ORDER BY created_at DESC;
```

---

#3. Xem account + character tổng quan

Công dụng: xem người chơi nào có character nào, origin, level, exp, tiền hiện có.

```sql
SELECT
  u.id AS user_id,
  u.username,
  u.email,
  u.role,
  u.created_at AS registered_at,

  c.id AS character_id,
  c.data->>'name' AS character_name,
  c.data->>'originId' AS origin,
  (c.data->'progression'->>'level')::int AS level,
  (c.data->'progression'->>'exp')::int AS exp,
  (c.data->>'moneyBronze')::int AS money_bronze,
  c.created_at AS character_created_at,
  c.updated_at AS character_updated_at
FROM auth_users u
LEFT JOIN characters c
  ON c.user_id = u.id
ORDER BY u.created_at DESC, c.created_at DESC;
```

---

#4. Xem 6 stat chính của từng character

Công dụng: xem STR / DEX / CON / INT / WIS / LUK, kèm fragment và bonus tích lũy.

```sql
SELECT
  u.username,
  u.email,
  c.data->>'name' AS character_name,
  c.data->>'originId' AS origin,

  (c.data->'stats'->'STR'->>'currentValue')::int AS str_base,
  (c.data->'stats'->'STR'->>'fragmentCount')::int AS str_fragments,
  (c.data->'stats'->'STR'->>'accumulatedBonus')::int AS str_bonus,

  (c.data->'stats'->'DEX'->>'currentValue')::int AS dex_base,
  (c.data->'stats'->'DEX'->>'fragmentCount')::int AS dex_fragments,
  (c.data->'stats'->'DEX'->>'accumulatedBonus')::int AS dex_bonus,

  (c.data->'stats'->'CON'->>'currentValue')::int AS con_base,
  (c.data->'stats'->'CON'->>'fragmentCount')::int AS con_fragments,
  (c.data->'stats'->'CON'->>'accumulatedBonus')::int AS con_bonus,

  (c.data->'stats'->'INT'->>'currentValue')::int AS int_base,
  (c.data->'stats'->'INT'->>'fragmentCount')::int AS int_fragments,
  (c.data->'stats'->'INT'->>'accumulatedBonus')::int AS int_bonus,

  (c.data->'stats'->'WIS'->>'currentValue')::int AS wis_base,
  (c.data->'stats'->'WIS'->>'fragmentCount')::int AS wis_fragments,
  (c.data->'stats'->'WIS'->>'accumulatedBonus')::int AS wis_bonus,

  (c.data->'stats'->'LUK'->>'currentValue')::int AS luk_base,
  (c.data->'stats'->'LUK'->>'fragmentCount')::int AS luk_fragments,
  (c.data->'stats'->'LUK'->>'accumulatedBonus')::int AS luk_bonus
FROM characters c
JOIN auth_users u
  ON u.id = c.user_id
ORDER BY c.updated_at DESC;
```

---

#5. Xem stat hiệu dụng của character

Công dụng: xem stat thật đang dùng để tính gameplay.  
Công thức: `currentValue + accumulatedBonus`.

```sql
SELECT
  u.username,
  u.email,
  c.data->>'name' AS character_name,
  c.data->>'originId' AS origin,

  (c.data->'stats'->'STR'->>'currentValue')::int
    + (c.data->'stats'->'STR'->>'accumulatedBonus')::int AS str,

  (c.data->'stats'->'DEX'->>'currentValue')::int
    + (c.data->'stats'->'DEX'->>'accumulatedBonus')::int AS dex,

  (c.data->'stats'->'CON'->>'currentValue')::int
    + (c.data->'stats'->'CON'->>'accumulatedBonus')::int AS con,

  (c.data->'stats'->'INT'->>'currentValue')::int
    + (c.data->'stats'->'INT'->>'accumulatedBonus')::int AS int,

  (c.data->'stats'->'WIS'->>'currentValue')::int
    + (c.data->'stats'->'WIS'->>'accumulatedBonus')::int AS wis,

  (c.data->'stats'->'LUK'->>'currentValue')::int
    + (c.data->'stats'->'LUK'->>'accumulatedBonus')::int AS luk
FROM characters c
JOIN auth_users u
  ON u.id = c.user_id
ORDER BY c.updated_at DESC;
```

---

#6. Xem HP / MP / Stamina hiện tại và tối đa

Công dụng: kiểm tra trạng thái sống còn của character sau exploration, combat, inn rest.

```sql
SELECT
  u.username,
  u.email,
  c.data->>'name' AS character_name,

  (c.data->'currentState'->>'hp')::int AS hp,
  (c.data->'derivedStats'->>'maxHp')::int AS max_hp,

  (c.data->'currentState'->>'mp')::int AS mp,
  (c.data->'derivedStats'->>'maxMp')::int AS max_mp,

  (c.data->'currentState'->>'stamina')::int AS stamina,
  (c.data->'derivedStats'->>'maxStamina')::int AS max_stamina,

  (c.data->>'fatigue')::numeric AS fatigue
FROM characters c
JOIN auth_users u
  ON u.id = c.user_id
ORDER BY c.updated_at DESC;
```

---

#7. Xem derived stats combat

Công dụng: xem các chỉ số chiến đấu như pAtk, mAtk, pDef, mDef, speed, crit, accuracy.

```sql
SELECT
  u.username,
  u.email,
  c.data->>'name' AS character_name,

  (c.data->'derivedStats'->>'pAtk')::int AS p_atk,
  (c.data->'derivedStats'->>'mAtk')::int AS m_atk,
  (c.data->'derivedStats'->>'pDef')::int AS p_def,
  (c.data->'derivedStats'->>'mDef')::int AS m_def,

  (c.data->'derivedStats'->>'actionSpeed')::int AS action_speed,
  (c.data->'derivedStats'->>'accuracy')::int AS accuracy,
  (c.data->'derivedStats'->>'evasionRate')::int AS evasion_rate,

  (c.data->'derivedStats'->>'critRate')::int AS crit_rate,
  (c.data->'derivedStats'->>'critDamageBonus')::int AS crit_damage_bonus,

  (c.data->'derivedStats'->>'statusResist')::int AS status_resist,
  (c.data->'derivedStats'->>'secondChanceRate')::int AS second_chance_rate,
  (c.data->'derivedStats'->>'procRate')::int AS proc_rate
FROM characters c
JOIN auth_users u
  ON u.id = c.user_id
ORDER BY c.updated_at DESC;
```

---

#8. Xem item/material từng player đang có

Công dụng: group inventory theo item_id và quantity.

```sql
SELECT
  u.username,
  u.email,
  c.data->>'name' AS character_name,
  item.item_id,
  COUNT(*) AS quantity
FROM characters c
JOIN auth_users u
  ON u.id = c.user_id
CROSS JOIN LATERAL jsonb_array_elements_text(c.data->'inventoryItemIds') AS item(item_id)
GROUP BY
  u.username,
  u.email,
  c.data->>'name',
  item.item_id
ORDER BY
  u.username,
  character_name,
  quantity DESC,
  item.item_id;
```

---

#9. Xem equipment đang mặc/cầm

Công dụng: xem item nào đang được equip.

```sql
SELECT
  u.username,
  u.email,
  c.data->>'name' AS character_name,
  equipped.item_id AS equipped_item_id
FROM characters c
JOIN auth_users u
  ON u.id = c.user_id
LEFT JOIN LATERAL jsonb_array_elements_text(c.data->'equippedItemIds') AS equipped(item_id)
  ON true
ORDER BY
  u.username,
  character_name,
  equipped_item_id;
```

---

#10. Xem skills đã học và skills đang equip

Công dụng: kiểm tra skill progression hiện tại của player.

```sql
SELECT
  u.username,
  u.email,
  c.data->>'name' AS character_name,
  c.data->'learnedSkillIds' AS learned_skill_ids,
  c.data->'equippedSkillIds' AS equipped_skill_ids
FROM characters c
JOIN auth_users u
  ON u.id = c.user_id
ORDER BY c.updated_at DESC;
```

---

#11. Tạo view tổng quan player

Công dụng: tạo view admin để sau này chỉ cần SELECT là xem được account + character + level + stat + resource.

```sql
CREATE OR REPLACE VIEW admin_player_overview AS
SELECT
  u.id AS user_id,
  u.username,
  u.email,
  u.role,
  u.created_at AS registered_at,

  c.id AS character_id,
  c.data->>'name' AS character_name,
  c.data->>'originId' AS origin,

  (c.data->'progression'->>'level')::int AS level,
  (c.data->'progression'->>'exp')::int AS exp,

  (c.data->>'moneyBronze')::int AS money_bronze,

  (c.data->'currentState'->>'hp')::int AS hp,
  (c.data->'derivedStats'->>'maxHp')::int AS max_hp,

  (c.data->'currentState'->>'mp')::int AS mp,
  (c.data->'derivedStats'->>'maxMp')::int AS max_mp,

  (c.data->'currentState'->>'stamina')::int AS stamina,
  (c.data->'derivedStats'->>'maxStamina')::int AS max_stamina,

  (c.data->'stats'->'STR'->>'currentValue')::int
    + (c.data->'stats'->'STR'->>'accumulatedBonus')::int AS str,

  (c.data->'stats'->'DEX'->>'currentValue')::int
    + (c.data->'stats'->'DEX'->>'accumulatedBonus')::int AS dex,

  (c.data->'stats'->'CON'->>'currentValue')::int
    + (c.data->'stats'->'CON'->>'accumulatedBonus')::int AS con,

  (c.data->'stats'->'INT'->>'currentValue')::int
    + (c.data->'stats'->'INT'->>'accumulatedBonus')::int AS int,

  (c.data->'stats'->'WIS'->>'currentValue')::int
    + (c.data->'stats'->'WIS'->>'accumulatedBonus')::int AS wis,

  (c.data->'stats'->'LUK'->>'currentValue')::int
    + (c.data->'stats'->'LUK'->>'accumulatedBonus')::int AS luk,

  c.created_at AS character_created_at,
  c.updated_at AS character_updated_at
FROM auth_users u
LEFT JOIN characters c
  ON c.user_id = u.id;
```

---

#12. Dùng view tổng quan player

Công dụng: xem nhanh toàn bộ player overview sau khi đã tạo view #11.

```sql
SELECT *
FROM admin_player_overview
ORDER BY registered_at DESC, character_updated_at DESC;
```

---

#13. Tạo view inventory/material

Công dụng: tạo view admin để xem item/material từng character đang có.

```sql
CREATE OR REPLACE VIEW admin_player_inventory AS
SELECT
  u.id AS user_id,
  u.username,
  u.email,
  c.id AS character_id,
  c.data->>'name' AS character_name,
  item.item_id,
  COUNT(*) AS quantity
FROM characters c
JOIN auth_users u
  ON u.id = c.user_id
CROSS JOIN LATERAL jsonb_array_elements_text(c.data->'inventoryItemIds') AS item(item_id)
GROUP BY
  u.id,
  u.username,
  u.email,
  c.id,
  c.data->>'name',
  item.item_id;
```

---

#14. Dùng view inventory/material

Công dụng: xem nhanh item/material sau khi đã tạo view #13.

```sql
SELECT *
FROM admin_player_inventory
ORDER BY username, character_name, quantity DESC, item_id;
```

---

#15. Xem riêng inventory của một username

Công dụng: lọc inventory theo username cụ thể.

```sql
SELECT *
FROM admin_player_inventory
WHERE username = 'YOUR_USERNAME_HERE'
ORDER BY character_name, quantity DESC, item_id;
```

---

#16. Xem riêng character của một username

Công dụng: lọc overview theo username cụ thể.

```sql
SELECT *
FROM admin_player_overview
WHERE username = 'YOUR_USERNAME_HERE'
ORDER BY character_updated_at DESC;
```

---

#17. Xem các character mới cập nhật gần nhất

Công dụng: biết player nào vừa chơi gần đây.

```sql
SELECT
  u.username,
  u.email,
  c.data->>'name' AS character_name,
  c.data->>'originId' AS origin,
  (c.data->'progression'->>'level')::int AS level,
  c.updated_at
FROM characters c
JOIN auth_users u
  ON u.id = c.user_id
ORDER BY c.updated_at DESC
LIMIT 20;
```

---

#18. Xem current character của từng user

Công dụng: biết character nào đang được user chọn làm current.

```sql
SELECT
  u.username,
  u.email,
  cc.user_id,
  cc.character_id,
  c.data->>'name' AS current_character_name,
  c.data->>'originId' AS origin,
  (c.data->'progression'->>'level')::int AS level,
  cc.updated_at
FROM current_characters cc
JOIN auth_users u
  ON u.id = cc.user_id
LEFT JOIN characters c
  ON c.id = cc.character_id
ORDER BY cc.updated_at DESC;
```

---

#19. Đếm số account / character hiện có

Công dụng: thống kê nhanh số lượng user và character.

```sql
SELECT
  (SELECT COUNT(*) FROM auth_users) AS total_users,
  (SELECT COUNT(*) FROM characters) AS total_characters,
  (SELECT COUNT(*) FROM current_characters) AS total_current_character_rows;
```

---

#20. Đếm số character theo origin

Công dụng: xem người chơi chọn origin nào nhiều nhất.

```sql
SELECT
  c.data->>'originId' AS origin,
  COUNT(*) AS character_count
FROM characters c
GROUP BY c.data->>'originId'
ORDER BY character_count DESC, origin;
```

---

#21. Xem phân bố level

Công dụng: xem player đang ở level nào nhiều nhất.

```sql
SELECT
  (c.data->'progression'->>'level')::int AS level,
  COUNT(*) AS character_count
FROM characters c
GROUP BY (c.data->'progression'->>'level')::int
ORDER BY level;
```

---

#22. Xem item nào đang phổ biến nhất

Công dụng: biết material/item nào đang xuất hiện nhiều trong toàn bộ economy.

```sql
SELECT
  item_id,
  SUM(quantity) AS total_quantity,
  COUNT(DISTINCT character_id) AS holder_count
FROM admin_player_inventory
GROUP BY item_id
ORDER BY total_quantity DESC, holder_count DESC, item_id;
```

---

#23. Xem player giàu nhất

Công dụng: kiểm tra economy, ai đang có nhiều Bronze nhất.

```sql
SELECT
  username,
  email,
  character_name,
  money_bronze,
  level,
  exp
FROM admin_player_overview
WHERE character_id IS NOT NULL
ORDER BY money_bronze DESC
LIMIT 20;
```

---

#24. Xem player có level cao nhất

Công dụng: kiểm tra progression cao nhất hiện tại.

```sql
SELECT
  username,
  email,
  character_name,
  origin,
  level,
  exp,
  money_bronze
FROM admin_player_overview
WHERE character_id IS NOT NULL
ORDER BY level DESC, exp DESC
LIMIT 20;
```

---

#25. Xem raw JSON của một character

Công dụng: debug khi view chưa đủ chi tiết.

```sql
SELECT
  u.username,
  u.email,
  c.id AS character_id,
  c.data
FROM characters c
JOIN auth_users u
  ON u.id = c.user_id
WHERE c.id = 'CHARACTER_ID_HERE';
```

---

#26. Xem raw JSON của character theo username

Công dụng: debug toàn bộ character data của một user.

```sql
SELECT
  u.username,
  u.email,
  c.id AS character_id,
  c.data
FROM characters c
JOIN auth_users u
  ON u.id = c.user_id
WHERE u.username = 'YOUR_USERNAME_HERE'
ORDER BY c.updated_at DESC;
```

---

#27. Xóa view nếu cần tạo lại từ đầu

Công dụng: xóa admin view cũ nếu muốn recreate sạch.

```sql
DROP VIEW IF EXISTS admin_player_inventory;
DROP VIEW IF EXISTS admin_player_overview;
```

---

#28. Lưu ý bảo mật

Không nên chạy:

```sql
SELECT * FROM auth_users;
```

trên màn hình public hoặc khi quay video, vì bảng này có `password_hash` và `password_salt`.

Nên dùng:

```sql
SELECT
  id,
  username,
  email,
  role,
  created_at
FROM auth_users
ORDER BY created_at DESC;
```
