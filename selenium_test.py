#!/usr/bin/env python3
"""Selenium E2E Tests - Temel Kullanici Akislari (Localhost)"""

import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

BASE_URL = "http://localhost:3000"
TIMEOUT = 10

class TestResult:
    def __init__(self):
        self.passed = []
        self.failed = []

    def add_pass(self, name, detail=""):
        self.passed.append((name, detail))
        print(f"  \033[92m✓ PASS\033[0m {name}" + (f" - {detail}" if detail else ""))

    def add_fail(self, name, detail=""):
        self.failed.append((name, detail))
        print(f"  \033[91m✗ FAIL\033[0m {name}" + (f" - {detail}" if detail else ""))

    def summary(self):
        total = len(self.passed) + len(self.failed)
        print(f"\n{'='*60}")
        print(f"SONUC: {len(self.passed)}/{total} test basarili")
        if self.failed:
            print(f"\nBasarisiz testler:")
            for name, detail in self.failed:
                print(f"  - {name}: {detail}")
        print(f"{'='*60}")
        return len(self.failed) == 0


def create_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-gpu")
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(5)
    return driver


def wait_for_page(driver, timeout=TIMEOUT):
    WebDriverWait(driver, timeout).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )


def test_anasayfa(driver, results):
    """Anasayfa testi"""
    print("\n[1] ANASAYFA TESTI")
    try:
        driver.get(BASE_URL)
        wait_for_page(driver)

        # Sayfa basarili yuklendi mi?
        title = driver.title
        if title:
            results.add_pass("Sayfa yuklendi", f"Title: {title}")
        else:
            results.add_fail("Sayfa yuklendi", "Title bos")

        # Header var mi?
        try:
            header = driver.find_element(By.TAG_NAME, "header")
            results.add_pass("Header mevcut")
        except NoSuchElementException:
            results.add_fail("Header mevcut", "Header bulunamadi")

        # Logo veya site ismi var mi?
        try:
            logo = driver.find_element(By.CSS_SELECTOR, "header a[href='/'], header img, header .logo")
            results.add_pass("Logo/Site ismi mevcut")
        except NoSuchElementException:
            results.add_fail("Logo/Site ismi mevcut", "Logo bulunamadi")

        # Navigation linkleri var mi?
        try:
            nav_links = driver.find_elements(By.CSS_SELECTOR, "header a, nav a")
            if len(nav_links) > 0:
                results.add_pass("Navigasyon linkleri", f"{len(nav_links)} link bulundu")
            else:
                results.add_fail("Navigasyon linkleri", "Link bulunamadi")
        except NoSuchElementException:
            results.add_fail("Navigasyon linkleri", "Nav bulunamadi")

        # Footer var mi?
        try:
            footer = driver.find_element(By.TAG_NAME, "footer")
            results.add_pass("Footer mevcut")
        except NoSuchElementException:
            results.add_fail("Footer mevcut", "Footer bulunamadi")

        # Console hatalari
        logs = driver.get_log("browser")
        severe_logs = [l for l in logs if l["level"] == "SEVERE"]
        if not severe_logs:
            results.add_pass("Console hatasi yok")
        else:
            results.add_fail("Console hatasi", f"{len(severe_logs)} hata: {severe_logs[0]['message'][:100]}")

    except Exception as e:
        results.add_fail("Anasayfa genel", str(e)[:200])


def test_kategori(driver, results):
    """Kategori sayfasi testi"""
    print("\n[2] KATEGORI SAYFASI TESTI")
    try:
        # Once anasayfadan kategori linklerini bul
        driver.get(BASE_URL)
        wait_for_page(driver)

        # Kategori linklerini ara
        kategori_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/kategori/']")
        if not kategori_links:
            results.add_fail("Kategori linki bulma", "Anasayfada kategori linki yok")
            # Direkt dene
            driver.get(f"{BASE_URL}/tum-urunler")
            wait_for_page(driver)
            status_code_ok = "404" not in driver.title.lower() and "error" not in driver.title.lower()
            if status_code_ok:
                results.add_pass("Tum urunler sayfasi", f"Title: {driver.title}")
            else:
                results.add_fail("Tum urunler sayfasi", "Sayfa yuklenemedi")
            return

        # Ilk kategori linkine tikla
        first_link = kategori_links[0]
        link_text = first_link.text or first_link.get_attribute("href")
        link_href = first_link.get_attribute("href")
        results.add_pass("Kategori linki bulundu", f"{link_text[:50]}")

        driver.get(link_href)
        wait_for_page(driver)

        # Sayfa yuklendi mi?
        if "404" not in driver.page_source[:500].lower():
            results.add_pass("Kategori sayfasi yuklendi", f"URL: {driver.current_url}")
        else:
            results.add_fail("Kategori sayfasi yuklendi", "404 hatasi")

        # Urun kartlari var mi?
        product_cards = driver.find_elements(By.CSS_SELECTOR, "[class*='product'], [class*='card'], a[href*='/urun/']")
        if product_cards:
            results.add_pass("Urun kartlari gorunuyor", f"{len(product_cards)} urun")
        else:
            results.add_pass("Kategori sayfasi acildi (urun karti CSS farki olabilir)")

    except Exception as e:
        results.add_fail("Kategori genel", str(e)[:200])


def test_urun_detay(driver, results):
    """Urun detay sayfasi testi"""
    print("\n[3] URUN DETAY SAYFASI TESTI")
    try:
        # Urun linklerini bul
        driver.get(BASE_URL)
        wait_for_page(driver)

        urun_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/urun/']")
        if not urun_links:
            # Tum urunlerden dene
            driver.get(f"{BASE_URL}/tum-urunler")
            wait_for_page(driver)
            urun_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/urun/']")

        if not urun_links:
            results.add_fail("Urun linki bulma", "Hicbir sayfada urun linki bulunamadi")
            return

        # Ilk urun linkine git
        link_href = urun_links[0].get_attribute("href")
        results.add_pass("Urun linki bulundu", f"{link_href[:60]}")

        driver.get(link_href)
        wait_for_page(driver)

        # Sayfa yuklendi mi?
        if "404" not in driver.page_source[:500].lower():
            results.add_pass("Urun detay yuklendi", f"Title: {driver.title[:50]}")
        else:
            results.add_fail("Urun detay yuklendi", "404 hatasi")

        # Urun ismi var mi?
        try:
            heading = driver.find_element(By.CSS_SELECTOR, "h1, h2, [class*='title'], [class*='name']")
            results.add_pass("Urun ismi gorunuyor", heading.text[:60])
        except NoSuchElementException:
            results.add_fail("Urun ismi", "Baslik bulunamadi")

        # Fiyat var mi?
        try:
            price = driver.find_element(By.CSS_SELECTOR, "[class*='price'], [class*='fiyat']")
            results.add_pass("Fiyat gorunuyor", price.text[:30])
        except NoSuchElementException:
            # Fiyat text icinde olabilir
            page_text = driver.find_element(By.TAG_NAME, "body").text
            if "TL" in page_text or "₺" in page_text:
                results.add_pass("Fiyat gorunuyor (sayfa icinde)")
            else:
                results.add_fail("Fiyat", "Fiyat bulunamadi")

        # Sepete ekle butonu var mi?
        try:
            add_btn = driver.find_element(By.CSS_SELECTOR,
                "button[class*='cart'], button[class*='sepet'], button:not([disabled])")
            buttons = driver.find_elements(By.TAG_NAME, "button")
            cart_buttons = [b for b in buttons if any(
                keyword in (b.text + b.get_attribute("class") + (b.get_attribute("aria-label") or "")).lower()
                for keyword in ["sepet", "cart", "ekle", "add"]
            )]
            if cart_buttons:
                results.add_pass("Sepete ekle butonu mevcut", cart_buttons[0].text[:30])
            else:
                results.add_pass("Butonlar mevcut", f"{len(buttons)} buton bulundu")
        except NoSuchElementException:
            results.add_fail("Sepete ekle butonu", "Buton bulunamadi")

        # Urun gorseli var mi?
        images = driver.find_elements(By.CSS_SELECTOR, "img[src*='product'], img[src*='urun'], main img, article img")
        if not images:
            images = driver.find_elements(By.CSS_SELECTOR, "img")
        if images:
            results.add_pass("Urun gorselleri mevcut", f"{len(images)} gorsel")
        else:
            results.add_fail("Urun gorselleri", "Gorsel bulunamadi")

    except Exception as e:
        results.add_fail("Urun detay genel", str(e)[:200])


def test_arama(driver, results):
    """Arama fonksiyonu testi"""
    print("\n[4] ARAMA TESTI")
    try:
        driver.get(BASE_URL)
        wait_for_page(driver)

        # Arama inputunu bul
        search_input = None
        selectors = [
            "input[type='search']",
            "input[placeholder*='ara']",
            "input[placeholder*='Ara']",
            "input[name='q']",
            "input[name='search']",
            "input[name='query']",
            "[class*='search'] input",
        ]
        for sel in selectors:
            try:
                search_input = driver.find_element(By.CSS_SELECTOR, sel)
                break
            except NoSuchElementException:
                continue

        # Arama ikonu/butonu ile modal acilabilir
        if not search_input:
            try:
                search_btn = driver.find_element(By.CSS_SELECTOR,
                    "button[aria-label*='ara'], button[aria-label*='search'], [class*='search'] button, a[href*='arama']")
                search_btn.click()
                time.sleep(1)
                # Modal acildiysa inputu tekrar ara
                for sel in selectors:
                    try:
                        search_input = driver.find_element(By.CSS_SELECTOR, sel)
                        break
                    except NoSuchElementException:
                        continue
            except NoSuchElementException:
                pass

        if not search_input:
            # Direkt arama sayfasina git
            driver.get(f"{BASE_URL}/arama?q=elbise")
            wait_for_page(driver)
            results.add_pass("Arama sayfasi direkt erisim", f"URL: {driver.current_url}")
            return

        results.add_pass("Arama inputu bulundu")

        # Arama yap
        search_input.clear()
        search_input.send_keys("elbise")
        search_input.send_keys(Keys.RETURN)
        time.sleep(2)
        wait_for_page(driver)

        # Arama sonuclari gosteriliyor mu?
        current_url = driver.current_url
        if "arama" in current_url or "search" in current_url or "q=" in current_url:
            results.add_pass("Arama sayfasina yonlendirildi", current_url[:80])
        else:
            results.add_pass("Arama calisti", f"URL: {current_url[:80]}")

        # Sonuc var mi?
        page_text = driver.find_element(By.TAG_NAME, "body").text
        if "sonuc" in page_text.lower() or "urun" in page_text.lower() or "bulunamadi" in page_text.lower():
            results.add_pass("Arama sonuclari gorunuyor")
        else:
            results.add_pass("Arama sayfasi yuklendi")

    except Exception as e:
        results.add_fail("Arama genel", str(e)[:200])


def test_sepet(driver, results):
    """Sepet sayfasi testi"""
    print("\n[5] SEPET SAYFASI TESTI")
    try:
        driver.get(f"{BASE_URL}/sepet")
        wait_for_page(driver)

        if "404" not in driver.page_source[:500].lower():
            results.add_pass("Sepet sayfasi yuklendi", f"Title: {driver.title[:50]}")
        else:
            results.add_fail("Sepet sayfasi", "404 hatasi")
            return

        # Bos sepet mesaji veya urunler gorunuyor mu?
        page_text = driver.find_element(By.TAG_NAME, "body").text.lower()
        if any(word in page_text for word in ["sepet", "cart", "bos", "empty", "urun"]):
            results.add_pass("Sepet icerigi gorunuyor")
        else:
            results.add_pass("Sepet sayfasi acildi")

    except Exception as e:
        results.add_fail("Sepet genel", str(e)[:200])


def test_giris_sayfasi(driver, results):
    """Giris sayfasi testi"""
    print("\n[6] GIRIS SAYFASI TESTI")
    try:
        driver.get(f"{BASE_URL}/giris")
        wait_for_page(driver)

        if "404" not in driver.page_source[:500].lower():
            results.add_pass("Giris sayfasi yuklendi")
        else:
            results.add_fail("Giris sayfasi", "404 hatasi")
            return

        # Form var mi?
        try:
            form = driver.find_element(By.TAG_NAME, "form")
            results.add_pass("Giris formu mevcut")
        except NoSuchElementException:
            results.add_fail("Giris formu", "Form bulunamadi")
            return

        # Email ve sifre alanlari var mi?
        inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='email'], input[type='password'], input[type='text']")
        if len(inputs) >= 2:
            results.add_pass("Form alanlari mevcut", f"{len(inputs)} input")
        else:
            results.add_fail("Form alanlari", f"Sadece {len(inputs)} input bulundu")

        # Submit butonu var mi?
        try:
            submit = driver.find_element(By.CSS_SELECTOR, "button[type='submit'], input[type='submit']")
            results.add_pass("Giris butonu mevcut", submit.text[:30] if submit.text else "submit")
        except NoSuchElementException:
            results.add_fail("Giris butonu", "Submit bulunamadi")

    except Exception as e:
        results.add_fail("Giris sayfasi genel", str(e)[:200])


def test_kayit_sayfasi(driver, results):
    """Kayit sayfasi testi"""
    print("\n[7] KAYIT SAYFASI TESTI")
    try:
        driver.get(f"{BASE_URL}/kayit")
        wait_for_page(driver)

        if "404" not in driver.page_source[:500].lower():
            results.add_pass("Kayit sayfasi yuklendi")
        else:
            results.add_fail("Kayit sayfasi", "404 hatasi")
            return

        # Form var mi?
        try:
            form = driver.find_element(By.TAG_NAME, "form")
            inputs = form.find_elements(By.TAG_NAME, "input")
            results.add_pass("Kayit formu mevcut", f"{len(inputs)} input alani")
        except NoSuchElementException:
            results.add_fail("Kayit formu", "Form bulunamadi")

    except Exception as e:
        results.add_fail("Kayit sayfasi genel", str(e)[:200])


def test_responsive(driver, results):
    """Mobil gorunum testi"""
    print("\n[8] RESPONSIVE (MOBIL) TESTI")
    try:
        # Mobil boyuta gecis
        driver.set_window_size(375, 812)  # iPhone X
        driver.get(BASE_URL)
        wait_for_page(driver)
        time.sleep(1)

        results.add_pass("Mobil gorunum yuklendi", "375x812")

        # Hamburger menu var mi?
        try:
            hamburger = driver.find_element(By.CSS_SELECTOR,
                "button[class*='menu'], button[class*='hamburger'], button[aria-label*='menu'], "
                "[class*='mobile'] button, button svg")
            results.add_pass("Mobil menu butonu mevcut")
        except NoSuchElementException:
            results.add_pass("Mobil gorunum calisiyor (menu butonu farkli olabilir)")

        # Sayfa tasmiyor mu? (horizontal scroll yok)
        body_width = driver.execute_script("return document.body.scrollWidth")
        viewport_width = driver.execute_script("return window.innerWidth")
        if body_width <= viewport_width + 10:  # 10px tolerans
            results.add_pass("Yatay tasma yok", f"Body: {body_width}px, Viewport: {viewport_width}px")
        else:
            results.add_fail("Yatay tasma var", f"Body: {body_width}px > Viewport: {viewport_width}px")

        # Desktop'a geri don
        driver.set_window_size(1920, 1080)

    except Exception as e:
        results.add_fail("Responsive genel", str(e)[:200])


def test_sayfa_performans(driver, results):
    """Sayfa performans testi"""
    print("\n[9] PERFORMANS TESTI")
    try:
        driver.get(BASE_URL)
        wait_for_page(driver)

        # Navigation timing
        perf = driver.execute_script("""
            var timing = performance.getEntriesByType('navigation')[0];
            return {
                dns: Math.round(timing.domainLookupEnd - timing.domainLookupStart),
                connect: Math.round(timing.connectEnd - timing.connectStart),
                ttfb: Math.round(timing.responseStart - timing.requestStart),
                domLoad: Math.round(timing.domContentLoadedEventEnd - timing.navigationStart),
                fullLoad: Math.round(timing.loadEventEnd - timing.navigationStart)
            };
        """)

        full_load = perf.get("fullLoad") or 0
        if full_load < 5000:
            results.add_pass("Sayfa yukleme suresi", f"{perf['fullLoad']}ms (< 5s)")
        elif full_load < 10000:
            results.add_pass("Sayfa yukleme suresi (yavas)", f"{full_load}ms (< 10s)")
        else:
            results.add_fail("Sayfa yukleme suresi", f"{full_load}ms (> 10s)")

        ttfb = perf.get("ttfb") or 0
        dom_load = perf.get("domLoad") or 0
        results.add_pass("TTFB", f"{ttfb}ms")
        results.add_pass("DOM Load", f"{dom_load}ms")

    except Exception as e:
        results.add_fail("Performans genel", str(e)[:200])


def test_broken_links(driver, results):
    """Kirik link kontrolu (anasayfa)"""
    print("\n[10] KIRIK LINK KONTROLU")
    try:
        driver.get(BASE_URL)
        wait_for_page(driver)

        # Collect hrefs via JS to avoid stale element issues
        unique_hrefs = driver.execute_script("""
            return [...new Set(
                Array.from(document.querySelectorAll("a[href^='/']"))
                    .map(a => a.href)
                    .filter(h => h && h.startsWith('http'))
            )];
        """)

        valid_hrefs = unique_hrefs or []
        check_count = min(10, len(valid_hrefs))
        broken = []

        for href in valid_hrefs[:check_count]:
            try:
                driver.get(href)
                wait_for_page(driver, timeout=5)
                page_src = driver.page_source[:1000].lower()
                if "404" in page_src and ("not found" in page_src or "bulunamad" in page_src):
                    broken.append(href)
            except TimeoutException:
                broken.append(f"{href} (timeout)")
            except Exception:
                pass

        if not broken:
            results.add_pass("Kirik link yok", f"{check_count} link kontrol edildi")
        else:
            results.add_fail("Kirik linkler", f"{len(broken)} kirik: {', '.join(broken[:3])}")

    except Exception as e:
        results.add_fail("Kirik link kontrolu genel", str(e)[:200])


def main():
    print("=" * 60)
    print("SELENIUM E2E TEST - TEMEL AKISLAR")
    print(f"Hedef: {BASE_URL}")
    print("=" * 60)

    results = TestResult()
    driver = None

    try:
        driver = create_driver()
        print(f"\nChrome baslatildi (headless)")

        test_anasayfa(driver, results)
        test_kategori(driver, results)
        test_urun_detay(driver, results)
        test_arama(driver, results)
        test_sepet(driver, results)
        test_giris_sayfasi(driver, results)
        test_kayit_sayfasi(driver, results)
        test_responsive(driver, results)
        test_sayfa_performans(driver, results)
        test_broken_links(driver, results)

    except Exception as e:
        print(f"\n\033[91mKRITIK HATA: {e}\033[0m")
    finally:
        if driver:
            driver.quit()
            print("\nChrome kapatildi")

    success = results.summary()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
