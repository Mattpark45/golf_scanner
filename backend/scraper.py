from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime
import time  # 이 줄 추가

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime

class GolfScraper:
    def __init__(self):
        self.setup_driver()

    def setup_driver(self):
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        
        self.driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=chrome_options
        )

    def scrape_golf_data(self, target_date):
        try:
            url = f"https://www.teescanner.com/booking/list?tab=golfcourse&roundDay={target_date}"
            self.driver.get(url)
            
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, 'golf-inner-info'))
            )

            # 무한 스크롤
            last_height = self.driver.execute_script("return document.body.scrollHeight")
            while True:
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(2)
                new_height = self.driver.execute_script("return document.body.scrollHeight")
                if new_height == last_height:
                    break
                last_height = new_height

            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            location_divs = soup.find_all('div', class_='golf-inner-info')
            
            data_list = []
            scraping_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            for div in location_divs:
                time_element = div.find('span', class_='time')
                play_time = time_element.text.strip() if time_element else ''
                
                golf_data = {
                    'scraping_date': scraping_date,
                    'play_date': target_date,
                    'golf_course': div.find('strong').text.strip() if div.find('strong') else '정보없음',
                    'location': div.find('p', class_='location').text.strip() if div.find('p', class_='location') else '정보없음',
                    'price': div.find('span', class_='price').text.strip() if div.find('span', class_='price') else '정보없음',
                    'rating': div.find('a', class_='star-score').text.strip() if div.find('a', class_='star-score') else '정보없음',
                    'remaining_teams': div.find('button', class_='btn').text.strip() if div.find('button', class_='btn') else '정보없음',
                    'play_time': play_time
                }
                data_list.append(golf_data)

            return data_list
            
        except Exception as e:
            print(f"Scraping error: {str(e)}")
            return None

    def __del__(self):
        if hasattr(self, 'driver'):
            self.driver.quit()