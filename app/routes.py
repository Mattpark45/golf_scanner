from app import app, socketio
from flask import render_template, jsonify
from flask_socketio import emit
from app.scraper import GolfScraper
from datetime import datetime, timedelta
import pandas as pd

scraper = GolfScraper()

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('start_scanning')
def handle_scanning(data):
    target_date = data.get('date')
    try:
        results = scraper.scrape_golf_data(target_date)
        if results is not None:
            emit('scan_results', {
                'status': 'success',
                'data': results.to_dict('records')
            })
        else:
            emit('scan_error', {'message': '데이터 스크래핑 실패'})
    except Exception as e:
        emit('scan_error', {'message': str(e)})

@socketio.on('toggle_alarm')
def handle_alarm(data):
    golf_name = data.get('golf_name')
    is_active = data.get('is_active')
    teams = data.get('teams')
    play_time = data.get('play_time')
    
    if is_active:
        scraper.add_alarm(golf_name, teams, play_time)
        emit('alarm_update', {
            'status': 'added',
            'golf_name': golf_name,
            'message': f'알람이 설정되었습니다: {golf_name}'
        })
    else:
        scraper.remove_alarm(golf_name)
        emit('alarm_update', {
            'status': 'removed',
            'golf_name': golf_name,
            'message': f'알람이 해제되었습니다: {golf_name}'
        })