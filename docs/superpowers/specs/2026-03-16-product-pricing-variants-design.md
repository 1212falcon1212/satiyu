# Ürün Fiyat & Varyant Yönetimi İyileştirme

## Fiyat Etiket Değişikliği

DB yapısı aynı kalır, UI etiketleri değişir:

| DB Kolonu | UI Etiketi | Anlam |
|-----------|-----------|-------|
| `compare_price` | Fiyat | Normal/liste fiyatı |
| `price` | İndirimli Fiyat | Satış fiyatı |

Bu değişiklik: ürün listesi, ürün detay, varyant tablosu, toplu güncelleme dialog'u — tüm admin alanlarında uygulanır.

## 1. Toplu Fiyat Güncelleme

### Kapsam Seçimi
- **Checkbox ile seçim**: Ürün listesinde her satırda checkbox, toplu seçim
- **Filtre bazlı**: "Filtredeki tüm ürünlere uygula" seçeneği

### İşlem Tipleri
- Sabit tutar belirle
- Yüzde artır
- Yüzde azalt

### Hedef Alanlar
- Normal fiyat (`compare_price`)
- İndirimli fiyat (`price`)
- İkisi birden

### Backend
- `POST /admin/products/bulk-price` endpoint
- Payload: `{ product_ids: number[] | 'filter', filter: {...}, action: 'set' | 'increase' | 'decrease', value: number, is_percentage: boolean, targets: ['price', 'compare_price'] }`
- Transaction ile güncelleme, etkilenen ürün sayısı döner

## 2. Varyant Yönetimi İyileştirme

### Varyant Tipi Seçimi
- Sadece seçili tipleri göster, ilgisiz olanları gizle
- Tip seçimi checkbox ile

### Seçenek Filtreleme
- Seçilen tip içinden sadece istenen değerleri işaretle
- Tümünü seç / kaldır butonları

### Tek Varyant Ekleme
- Mevcut varyantları bozmadan "Varyant Ekle" butonu
- Seçili tip değerlerinden kombinasyon seç ve ekle

### Varyant Tablosu
- Kolonlar: VARYANT | SKU | BARKOD | FİYAT | İND. FİYAT | STOK | DURUM | İŞLEM
- FİYAT = compare_price, İND. FİYAT = price

### Toplu Varyant Güncelleme
- "Tümüne Uygula" butonu ile tüm varyantlara aynı fiyat/stok set etme
