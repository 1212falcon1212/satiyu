# Giyim E-Ticaret - Dönüşüm Roadmap

> **Proje:** Keskin Kamp → Giyim E-Ticaret dönüşümü
> **Teknoloji:** Laravel 11 + Next.js 16 + MySQL + Tailwind CSS
> **Son güncelleme:** 2026-03-14

---

## FAZ 1: Tasarım Dönüşümü (Kamp → Giyim)

> Kullanıcı referans tasarım paylaşacak. Mevcut değişiklikler temel altyapıyı hazırladı,
> tasarım referansına göre tekrar ince ayar yapılacak.

### Tamamlanan Temel Çalışmalar

| # | Task | Durum | Notlar |
|---|------|-------|--------|
| 1.1 | Renk Paleti & Tipografi | ✅ Temel | Primary: #1A1A1A (siyah), Accent: #C48B5C (bakır), Font: Playfair Display + DM Sans |
| 1.2 | Header & Navigasyon | ✅ Temel | Minimal header, alt çizgi hover nav, TreePine ikonu kaldırıldı |
| 1.3 | Ana Sayfa | ✅ Temel | Hero, AdvantageBar, ProductGrid, Newsletter yeni temaya uyarlandı |
| 1.4 | Ürün Listeleme & Kategori | ⚡ Kısmi | Renk geçişi yapıldı, layout referans tasarıma göre güncellenecek |
| 1.5 | Ürün Detay Sayfası | ⚡ Kısmi | Renk geçişi yapıldı, galeri/varyant UI referansa göre güncellenecek |
| 1.6 | Footer | ✅ Temel | Newsletter footer'a taşındı, sosyal ikonlar border stil, bg #1A1A1A |
| 1.7 | Sepet, Sipariş, Hesap | ⚡ Kısmi | Renk geçişi yapıldı, detaylı tasarım referansa göre |
| 1.8 | UI Bileşenleri | ✅ Temel | Button rounded-sm, siyah default; Badge/Alert danger semantik |

### Referans Tasarıma Göre Yapılacaklar

Kullanıcı tasarım örnekleri paylaştığında aşağıdakiler uyarlanacak:

- [ ] **Header layout** — Logo konumu, arama barı genişliği, ikon düzeni
- [ ] **Mega menü** — Kategori dropdown yapısı (giyim: Kadın/Erkek/Çocuk)
- [ ] **Hero banner** — Slider boyutu, CTA buton stilleri, overlay efektleri
- [ ] **Ürün kartı** — Hover efektleri, badge konumları, beden/renk önizleme
- [ ] **Filtre paneli** — Beden filtresi, renk swatch filtresi, fiyat slider
- [ ] **Ürün detay** — Galeri layout, beden tablosu, renk seçici büyüklüğü
- [ ] **Sepet sayfası** — Ürün satır tasarımı, kupon alanı
- [ ] **Checkout** — Adım göstergesi, form düzeni
- [ ] **Hesabım** — Dashboard kartları, sipariş listesi stili
- [ ] **Mobil** — Bottom nav bar, swipe gesture'lar, touch-friendly butonlar
- [ ] **Kampanya alanları** — İndirim banner'ları, countdown timer
- [ ] **Kategori vitrinleri** — Kadın/Erkek/Çocuk koleksiyon grid'leri

### Değişen Dosyalar (Faz 1)

```
frontend/
├── tailwind.config.ts                          ← Renk paleti, fontlar
├── src/app/globals.css                         ← CSS değişkenleri
├── src/app/layout.tsx                          ← Font, metadata
├── src/app/(shop)/page.tsx                     ← Ana sayfa
├── src/components/shop/
│   ├── header/ShopHeader.tsx                   ← Header yapısı
│   ├── header/CategoryNav.tsx                  ← Kategori navigasyonu
│   ├── header/MobileMenu.tsx                   ← Mobil menü
│   ├── header/MiniCart.tsx                      ← Mini sepet badge
│   ├── header/HeaderAuth.tsx                   ← Auth butonları
│   ├── header/HeaderFavorites.tsx              ← Favori badge
│   ├── home/HeroBanner.tsx                     ← Hero banner
│   ├── home/AdvantageBar.tsx                   ← Avantaj barı
│   ├── home/Newsletter.tsx                     ← Bülten
│   ├── ProductCard.tsx                         ← Ürün kartı (3/4 ratio)
│   ├── ProductGrid.tsx                         ← Ürün grid
│   ├── ShopFooter.tsx                          ← Footer
│   └── FooterNewsletter.tsx                    ← Footer bülten
├── src/components/ui/button.tsx                ← Buton stilleri
├── src/components/ui/badge.tsx                 ← Badge renkleri
├── src/components/ui/alert.tsx                 ← Alert renkleri
└── Tüm (shop) sayfaları                        ← "Keskin Kamp" → "Giyim Mağazası"
```

---

## FAZ 2: XML Import & Ürün Yönetimi

### Tamamlanan Çalışmalar

| # | Task | Durum | Notlar |
|---|------|-------|--------|
| 2.1 | Kategori Eşleştirme | ✅ Tamamlandı | Tablo: `xml_category_mappings`, CRUD API, import entegrasyonu |
| 2.2 | Marka Eşleştirme | ✅ Tamamlandı | Tablo: `xml_brand_mappings`, isim dönüşümü, CRUD API |
| 2.3 | Barkod Üretimi | ✅ Tamamlandı | `BarcodeGeneratorService` (EAN-13), prefix desteği |
| 2.4 | Fiyat Kuralları | ✅ Tamamlandı | Tablo: `xml_price_rules`, %, sabit, kategori/marka bazlı, yuvarlama |
| 2.5 | Wizard Arayüzü | ⚡ Temel | 7 adıma genişletildi, detaylı UI geliştirilecek |
| 2.6 | Pazaryeri Gönderim | 🔲 Bekliyor | XML→Pazaryeri akışı, toplu gönderim optimizasyonu |

### Yeni Backend Dosyaları

```
backend/
├── database/migrations/
│   ├── 2026_03_14_000001_create_xml_category_mappings_table.php
│   ├── 2026_03_14_000002_create_xml_brand_mappings_table.php
│   ├── 2026_03_14_000003_create_xml_price_rules_table.php
│   └── 2026_03_14_000004_add_import_settings_to_xml_sources_table.php
├── app/Models/
│   ├── XmlCategoryMapping.php
│   ├── XmlBrandMapping.php
│   ├── XmlPriceRule.php
│   └── XmlSource.php                          ← Güncellendi (yeni ilişkiler + casts)
├── app/Services/Xml/
│   ├── BarcodeGeneratorService.php             ← YENİ
│   ├── XmlPricingService.php                   ← YENİ
│   └── XmlImportService.php                    ← Güncellendi (mapping + pricing entegrasyonu)
├── app/Http/Controllers/Admin/
│   └── XmlMappingController.php                ← YENİ (kategori/marka/fiyat/barkod API)
└── routes/admin.php                            ← Yeni endpoint'ler eklendi
```

### Yeni API Endpoint'leri

```
# Kategori Eşleştirme
GET    /admin/xml-sources/{id}/category-mappings
POST   /admin/xml-sources/{id}/category-mappings
POST   /admin/xml-sources/{id}/category-mappings/batch
DELETE /admin/xml-sources/{id}/category-mappings/{mappingId}

# Marka Eşleştirme
GET    /admin/xml-sources/{id}/brand-mappings
POST   /admin/xml-sources/{id}/brand-mappings
POST   /admin/xml-sources/{id}/brand-mappings/batch
DELETE /admin/xml-sources/{id}/brand-mappings/{mappingId}

# Fiyat Kuralları
GET    /admin/xml-sources/{id}/price-rules
POST   /admin/xml-sources/{id}/price-rules
PUT    /admin/xml-sources/{id}/price-rules/{ruleId}
DELETE /admin/xml-sources/{id}/price-rules/{ruleId}
GET    /admin/xml-sources/{id}/price-preview

# Barkod Ayarları
PUT    /admin/xml-sources/{id}/barcode-settings
```

### Yapılacaklar (Faz 2 devam)

- [ ] **Kategori eşleştirme UI** — Admin panelde drag & drop veya select ile eşleştirme
- [ ] **Marka eşleştirme UI** — Toplu yeniden adlandırma, autocomplete ile eşleştirme
- [ ] **Fiyat kuralları UI** — Kural oluşturma formu, önizleme tablosu
- [ ] **Barkod ayarları UI** — Prefix ayarı, regenerate toggle
- [ ] **Fiyat önizleme** — Import öncesi orijinal vs düzenlenmiş fiyat karşılaştırması
- [ ] **Pazaryeri entegrasyonu** — XML ürünlerini Trendyol/HepsiBurada'ya gönderim
- [ ] **İmport loglama** — Hangi mapping/rule uygulandığını detaylı loglama

---

## Migration Checklist

Backend migration'ları çalıştırmak için:

```bash
cd backend
php artisan migrate
```

Yeni tablolar:
1. `xml_category_mappings` — XML kategori → site kategori eşleştirmesi
2. `xml_brand_mappings` — XML marka → site marka eşleştirmesi
3. `xml_price_rules` — Tedarikçi bazlı fiyat kuralları
4. `xml_sources` — `barcode_prefix` ve `barcode_regenerate` alanları eklendi

---

## Notlar

- Site adı admin panelden yönetiliyor, kod içinde sadece fallback var
- Renk teması `tailwind.config.ts` üzerinden merkezi kontrol
- Tüm "Keskin Kamp" referansları temizlendi (admin hariç — admin sayfalar iç kullanım)
- Mevcut tüm fonksiyonlar korundu, sadece görsel katman değişti
