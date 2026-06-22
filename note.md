# Magisterium — Game Design Notes

Tài liệu này ghi lại các ý tưởng gameplay dài hạn. Đây không phải danh sách bắt
buộc phải triển khai ngay; mỗi hệ thống vẫn cần được thiết kế, thử nghiệm và cân
bằng trước khi code.

## 1. Định hướng chung

- Magisterium là một thế giới fantasy khó đoán. Người chơi không được tùy chỉnh
  để giảm số lần gặp quái hoặc sự kiện.
- Origin chỉ là điểm khởi đầu. Cách sử dụng vũ khí, phân bổ stat và lựa chọn của
  người chơi sẽ dần tạo thành build riêng.
- Town là nơi nghỉ ngơi, giao dịch, học hỏi và tương tác với NPC.
- Zone là nơi khám phá và farm quái thường.
- Dungeon là thử thách tập trung vào boss và các cột mốc progression.
- Cái chết phải có hậu quả và tạo cảm xúc, nhưng người chơi vẫn có cơ hội sửa
  sai và lấy lại những gì đã mất.

Nguồn cảm hứng chính:

- Stardew Valley: mất một phần đồ khi bất tỉnh/chết và NPC có thể thu hồi đồ.
- Minecraft: quay lại tìm đồ trước khi hết thời gian.
- Elden Ring: tự xây dựng build thông qua stat, trang bị và cách chơi.

## 2. Exploration Events

Trong code hiện tại, nút `Search` đại diện cho việc nhân vật đi xung quanh và
khám phá zone hoặc dungeon. Mỗi lần Search có thể tạo một Exploration Event.

Kết quả có thể là:

- Gặp quái.
- Gặp cướp hoặc mối nguy hiểm.
- Gặp người dân/NPC cần giúp.
- Tìm thấy tiền, vật phẩm hoặc địa điểm lạ.
- Gặp một sự kiện có lựa chọn.
- Không có gì xảy ra.

Event và các lựa chọn nên xuất hiện trực tiếp trong bảng log Search, không nhất
thiết chuyển sang một màn hình riêng.

Ví dụ:

```text
Bạn bắt gặp một thương nhân có xe hàng bị hỏng.

[Giúp sửa xe] [Đòi tiền công] [Bỏ đi]
```

### Stat checks

Kết quả lựa chọn có thể phụ thuộc vào stat của nhân vật:

- STR: đối đầu trực tiếp, phá vật cản, đe dọa.
- DEX: chạy trốn, lẻn qua, thao tác nhanh hoặc bắn chính xác.
- CON: chịu đựng nguy hiểm, độc, thời tiết hoặc kiệt sức.
- INT: suy luận, giải câu đố, nhận biết ma thuật.
- WIS: phán đoán con người, nhận biết bẫy hoặc lựa chọn an toàn.
- LUK: ảnh hưởng nhẹ đến xác suất gặp event tốt/xấu và một số kết quả ngẫu
  nhiên.

LUK không được ảnh hưởng quá mạnh để tránh phá cân bằng. Stat cao nên tăng cơ
hội thành công, nhưng không nhất thiết bảo đảm thành công tuyệt đối.

### Event frequency

- Không có setting `few/normal/high`.
- Tần suất và loại event được quyết định bởi zone, dungeon, xác suất, LUK và
  trạng thái thế giới.
- Người chơi phải chấp nhận rằng hành trình ngoài Town luôn có yếu tố khó lường.

## 3. Combat

- Giữ nút Flee hiện có; ý tưởng thêm nút chạy khỏi combat đã hoàn thành.
- Những thông tin quan trọng nhất trong combat nên nằm bên trái hoặc ở vị trí
  người chơi nhìn thấy nhanh nhất.
- Về sau cần hoàn thiện status effects, passives, proc effects và skill runes.
- Có thể bổ sung encounter với nhiều quái trong cùng một trận.

## 4. Weapon Mastery

Mastery tăng theo nhóm vũ khí, không tăng theo từng món cụ thể.

Ví dụ:

- Sword Mastery.
- Bow Mastery.
- Staff Mastery.
- Dagger Mastery.
- Axe Mastery.
- Spear Mastery.

Sử dụng vũ khí thuộc nhóm tương ứng trong chiến đấu sẽ tăng mastery. Mastery có
thể dùng để:

- Tăng bonus nhỏ khi sử dụng nhóm vũ khí đó.
- Mở skill hoặc passive mới.
- Mở kỹ thuật, recipe hoặc nâng cấp đặc biệt.
- Trở thành điều kiện sử dụng trang bị tier cao.

## 5. Weapon Tier và Durability

Trang bị có tier/rarity. Tier tốt hơn có thể bền hơn và hao mòn chậm hơn.

Durability được trừ sau khi trận đấu kết thúc, dựa trên số lượng quái trong
trận:

```text
Durability loss
= số quái trong trận × hao mòn cơ bản × hệ số tier
```

Ví dụ: ba quái, mỗi quái gây 3 hao mòn thì trang bị mất 9 durability.

Định hướng tier:

- Common: hao mòn nhanh.
- Uncommon: bền hơn Common.
- Rare: hao mòn chậm hơn.
- Tier cao hơn tiếp tục giảm mức hao mòn, nhưng không nhất thiết bất hoại.

Khi durability về 0:

- Trang bị chuyển sang trạng thái `Broken`.
- Trang bị không biến mất.
- Trang bị Broken không cung cấp stat hoặc bị giảm mạnh hiệu quả.
- Người chơi có thể mang đến The Smith để sửa.
- Repair Stone có thể là một cách sửa chữa ngoài Town hoặc một nguyên liệu sửa
  chữa.

## 6. Death, Lost Items và Recovery

Khi nhân vật chết:

- Mất một phần inventory.
- Trang bị đang mặc cũng có thể bị rơi hoặc bị cướp.
- Một phần vật phẩm được NPC thu hồi.
- Người chơi có thể trả phí cho NPC để lấy lại số vật phẩm đó.
- Một phần vật phẩm bị con quái kết liễu người chơi lấy đi.

### Recovery monster

- Người chơi phải quay lại đúng zone/dungeon và dùng Search để tìm con quái.
- Hệ thống phải cung cấp dấu vết để người chơi biết nó vẫn còn trong khu vực.
- Dấu vết có thể rõ hơn hoặc xác suất tìm thấy có thể tăng dần sau mỗi lần
  Search thất bại.
- Con quái mang đồ phải được tăng stat dựa trên trang bị/vật phẩm nó đã lấy.
- Khi tìm thấy và đánh bại nó, người chơi lấy lại đồ.

Mục tiêu cảm xúc:

- Lo lắng vì có nguy cơ mất đồ.
- Có động lực quay lại đối mặt với nơi mình thất bại.
- Vui mừng và nhẹ nhõm khi giành lại được đồ.

### Thời gian

- Recovery monster tồn tại trong 30 phút thời gian thực.
- Thời gian vẫn trôi khi người chơi logout.
- Hết 30 phút, quái rời khỏi khu vực, dấu vết biến mất và số đồ nó giữ bị mất
  vĩnh viễn.

## 7. Currency và Economy

- Dữ liệu tiền có thể tiếp tục lưu bằng tổng số Bronze.
- UI hiển thị và quy đổi rõ ràng thành Bronze, Silver và Gold.
- Cần cân bằng lại giá MP Potion vì hiện được xem là quá đắt.
- Market content và stock sẽ được bổ sung dần.
- Reputation và quan hệ với NPC có thể tác động đến giá mua/bán.

## 8. Travel Pass và Item State

Travel Pass là giấy thông hành/cư trú theo từng thành phố:

- Mua riêng tại mỗi thành phố.
- Có thời hạn, ví dụ một tháng trong game.
- Có thể cần để cư trú hoặc sử dụng một số dịch vụ trong thành phố.
- Khi xây thêm nhiều thành phố, mỗi nơi có luật và loại pass riêng.
- Pass cần trạng thái hết hạn (`expiresAt` hoặc dữ liệu tương đương).

Về sau item có thể có trạng thái theo thời gian:

- Travel Pass hết hạn.
- Thực phẩm có độ tươi hoặc bị hỏng.
- Các loại item khác có thể bổ sung trạng thái nếu thực sự phục vụ gameplay.

## 9. Reputation

Reputation là danh tiếng của người chơi.

Reputation cao:

- NPC giảm giá.
- Giá bán có thể tốt hơn.
- Tăng khả năng được NPC giao quest.
- Mở hàng hóa, dịch vụ hoặc hội thoại đặc biệt.

Reputation thấp:

- NPC tăng giá.
- NPC có thể từ chối phục vụ hoặc giao quest.
- Khi xuống dưới một ngưỡng, người chơi có thể bị truy nã.

Nên cân nhắc nhiều lớp reputation:

- Reputation tại từng Town.
- Reputation với faction.
- Global reputation chỉ dùng cho những hành động thực sự nổi tiếng toàn thế
  giới.

## 10. NPC, Quest và Town

- Thêm NPC và hội thoại vào The Smith, The Sanctuary và The Library.
- NPC chưa cần giao quest ngay; hệ thống hội thoại có thể được xây trước.
- Reputation ảnh hưởng đến giá, hội thoại và xác suất nhận quest.
- Quest chain và cốt truyện sẽ được thiết kế sau.
- The Library có thể lưu Bestiary, item records, lore, quest records và về sau
  là nơi học/nghiên cứu phép.

## 11. Dungeon, Boss và Monster Families

- Zone dùng để farm quái thường.
- Dungeon tập trung vào boss và progression milestone.
- Boss cần reward đặc biệt và có thể cung cấp nguyên liệu crafting độc quyền.
- Chỉ triển khai boss khi combat stat và economy đã đủ cân bằng.

Lizard hiện là ý tưởng cho một monster family, không chỉ một quái đơn lẻ:

- Young/Wild Lizard.
- Armored Lizard.
- Lizard Warrior.
- Lizard Shaman.
- Lizard Chieftain hoặc boss tương đương.

## 12. Achievements

- Thêm achievements cho exploration, combat, crafting, mastery, reputation và
  các lựa chọn đặc biệt.
- Achievement nên ghi nhận hành trình hoặc mở cosmetic/title nhỏ, không nên
  cung cấp sức mạnh quá lớn.

## 13. UI/UX Backlog

- Cải thiện trang Character Creation.
- Thêm tooltip hoặc nút `?` cho stat và item để người chơi hiểu ngay trong game.
- Khi chọn character, hiển thị popup đầy đủ thông tin trước khi vào game.
- Làm popup xác nhận xóa character rõ ràng và an toàn hơn.
- Cải thiện Road/Exploration Event UI:
  - Giảm phần thông tin nhân vật nếu đang chiếm quá nhiều diện tích.
  - Tăng kích thước và độ dài phần mô tả sự kiện.
  - Hiển thị lựa chọn và kết quả ngay tại log Search.
- Kiểm tra lại form quản lý địa chỉ/email vì có hiện tượng nhập username và
  email cùng lúc.

## 14. Cần thiết kế/cân bằng trước khi triển khai

- Công thức stat check và tỷ lệ thành công của Exploration Event.
- Mức ảnh hưởng chính xác của LUK.
- Công thức tăng sức mạnh cho recovery monster dựa trên đồ đã cướp.
- Danh sách item có thể rơi khi chết và tỷ lệ mất.
- Cách NPC chọn và định giá đồ thu hồi.
- Durability loss theo slot, tier và số lượng quái.
- Chi phí sửa chữa và vai trò của Repair Stone.
- Tốc độ tăng Weapon Mastery và reward theo từng mốc.
- Phạm vi của reputation: Town, faction và global.
- Luật sử dụng/expiration của Travel Pass.
