from flask import Flask, jsonify, request
from flask_cors import CORS
from scraper import GolfScraper
import threading
import time

app = Flask(__name__)
CORS(app)

# 스크래핑 상태와 데이터를 저장할 전역 변수
scraping_status = {
    'is_running': False,
    'current_data': [],
    'selected_date': None
}

golf_scraper = GolfScraper()

def background_scraping():
    while scraping_status['is_running']:
        try:
            data = golf_scraper.scrape_golf_data(scraping_status['selected_date'])
            if data is not None:
                scraping_status['current_data'] = data
            time.sleep(300)  # 5분 대기
        except Exception as e:
            print(f"Scraping error: {str(e)}")
            scraping_status['is_running'] = False

@app.route('/api/start-scanning', methods=['POST'])
def start_scanning():
    data = request.get_json()
    selected_date = data.get('date')
    
    if not scraping_status['is_running']:
        scraping_status['is_running'] = True
        scraping_status['selected_date'] = selected_date
        threading.Thread(target=background_scraping, daemon=True).start()
        return jsonify({'message': 'Scanning started'})
    return jsonify({'message': 'Already scanning'})

@app.route('/api/stop-scanning', methods=['POST'])
def stop_scanning():
    scraping_status['is_running'] = False
    return jsonify({'message': 'Scanning stopped'})

@app.route('/api/golf-data', methods=['GET'])
def get_golf_data():
    return jsonify(scraping_status['current_data'])

if __name__ == '__main__':
    app.run(debug=True, port=5000)