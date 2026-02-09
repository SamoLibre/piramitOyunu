# Oyuncu Sayısı İzleme Seçenekleri

## Seçenek 1: Google Analytics (Ücretsiz, Kolay)
**Artıları:**
- Tamamen ücretsiz
- Kurulumu çok kolay (sadece bir script etiketi)
- Detaylı istatistikler (günlük/haftalık/aylık kullanıcılar, hangi sayfalar vs.)
- Gerçek zamanlı ziyaretçi takibi
- Mobil uygulama ile takip edebilirsiniz

**Eksileri:**
- Tam oyuncu sayısını göstermez (ziyaretçi sayısı gösterir)
- Google'ın gizlilik politikalarına tabi

**Nasıl yapılır:**
1. Google Analytics hesabı açın (analytics.google.com)
2. Bir property oluşturun
3. Size verilen tracking kodu index.html'e ekleyin
4. Google Analytics dashboardından istatistikleri görüntüleyin

---

## Seçenek 2: localStorage + Görüntüleme (Ücretsiz, Çok Basit)
**Artıları:**
- Hiçbir dış servis gerekmez
- Gizlilik dostu
- Hemen çalışır

**Eksileri:**
- Sadece browser bazlı sayım (her tarayıcı ayrı sayılır)
- Gerçek toplam oyuncu sayısını göstermez
- Tarayıcı temizlenirse sıfırlanır

**Nasıl yapılır:**
Kod örneği aşağıda verildi - oyundaki istatistik ekranına "Bugün X kişi oynadı" yazısı eklenir.

---

## Seçenek 3: Vercel Analytics (Basit, Ücretli/Ücretsiz Kota)
**Artıları:**
- Vercel ile entegre (zaten Vercel kullanıyorsunuz)
- Kurulumu çok kolay
- Ücretsiz kotası var (2500 event/ay)
- Web vitals ve performans metrikleri

**Eksileri:**
- Ücretsiz kota aşılırsa ücretli (fiyatları güncel olmayabilir, vercel.com'dan kontrol edin)
- Oyun çok popüler olursa hızla biter

**Nasıl yapılır:**
1. Vercel dashboard'dan Analytics'i aktif edin
2. `@vercel/analytics` paketini yükleyin
3. Kodu ekleyin

---

## Seçenek 4: Supabase (Backend Database - Ücretsiz Başlangıç)
**Artıları:**
- Gerçek database (PostgreSQL)
- Her oyunu kaydedebilirsiniz
- Liderboard yapabilirsiniz
- Gerçek zamanlı istatistikler
- 500MB database + 2GB bandwidth ücretsiz

**Eksileri:**
- Backend kurulumu gerekir
- Biraz daha teknik
- Ücretsiz limitler aşılırsa ücretli

**Nasıl yapılır:**
1. Supabase hesabı açın (supabase.com)
2. Bir proje oluşturun
3. `game_plays` tablosu oluşturun
4. JavaScript SDK ile oyun başında/bitişinde kayıt yapın
5. Dashboard'dan istatistikleri görün

---

## Seçenek 5: Firebase (Google Backend - Ücretsiz Başlangıç)
**Artıları:**
- Google'ın güvenilir servisi
- Realtime Database veya Firestore
- Liderboard yapabilirsiniz
- Cömert ücretsiz kota
- Kullanıcı kimlik doğrulama da ekleyebilirsiniz

**Eksileri:**
- Kurulum biraz karmaşık
- Google hesabı gerekir
- Çok fazla özellik olduğu için karmaşık olabilir

**Nasıl yapılır:**
1. Firebase console'dan proje oluşturun
2. Firestore Database aktif edin
3. Firebase SDK ekleyin
4. Her oyunda bir document ekleyin
5. Console'dan veya custom dashboard ile görüntüleyin

---

## Seçenek 6: Basit API + Vercel Serverless (Özel Çözüm)
**Artıları:**
- Tam kontrol sizde
- Vercel'in serverless fonksiyonları ücretsiz (100K çağrı/ay)
- İstediğiniz şekilde özelleştirebilirsiniz

**Eksileri:**
- Database için ayrı servis gerekir (Supabase, PlanetScale vs.)
- API kodu yazmanız gerekir

**Nasıl yapılır:**
1. Vercel Serverless fonksiyonu oluşturun
2. Ücretsiz bir database bağlayın (Supabase veya PlanetScale)
3. Oyun bitişinde API'ye POST request gönderin
4. Database'den sayıları çekin ve gösterin

---

## ÖNERİM - Size En Uygun Seçenek

### Hızlı ve Basit İçin: **Seçenek 1 (Google Analytics)**
- 5 dakikada kurulur
- İstatistikleri mobil uygulamadan takip edebilirsiniz
- Ücretsiz ve sınırsız

### Gelecekte Liderboard İsterseniz: **Seçenek 4 (Supabase)**
- İlk başta biraz zaman alır ama sonra çok güçlü
- Ücretsiz kotası yeterli
- İleride skor tablosu vs. ekleyebilirsiniz

Ben şahsen sizin için **Google Analytics** öneririm - hem kurulumu çok kolay hem de detaylı istatistik veriyor. İsterseniz şimdi kodunu ekleyeyim?

Eğer ileride "Bugün kaç kişi oynadı" gibi bir yazı göstermek isterseniz, Supabase ile başlayabiliriz.

**Hangisini tercih edersiniz?**
