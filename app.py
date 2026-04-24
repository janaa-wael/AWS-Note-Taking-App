from flask import Flask, request, render_template_string, redirect, url_for
import pymysql

app = Flask(__name__)

db_config = {
    'host': 'localhost',
    'user': 'app_user',
    'password': 'AppPass123!',
    'database': 'notes_app'
}

html_template = '''
<!DOCTYPE html>
<html>
<head>
    <title>My DevOps Notes</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 50px; background: #f0f0f0; }
        .container { max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px; }
        textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        input[type=submit] { margin-top: 10px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
        input[type=submit]:hover { background: #0056b3; }
        .note { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #007bff; border-radius: 5px; }
        .timestamp { color: #666; font-size: 0.9em; margin-bottom: 5px; }
        h2 { color: #333; margin-top: 0; }
        h3 { color: #555; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>📝 My DevOps Notes</h2>
        <form method="POST">
            <textarea name="note" rows="4" placeholder="Write your note here..."></textarea><br>
            <input type="submit" value="Save Note">
        </form>
        <h3>Previous Notes:</h3>
        {% for note in notes %}
            <div class="note">
                <div class="timestamp">📅 {{ note[2] }}</div>
                📌 {{ note[1] }}
            </div>
        {% endfor %}
    </div>
</body>
</html>
'''

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        new_note = request.form.get('note', '')
        if new_note and new_note.strip():
            conn = pymysql.connect(**db_config)
            cur = conn.cursor()
            cur.execute("INSERT INTO notes (note_text) VALUES (%s)", (new_note.strip(),))
            conn.commit()
            conn.close()
        return redirect(url_for('index'))
    
    # GET request - display notes
    conn = pymysql.connect(**db_config)
    cur = conn.cursor()
    cur.execute("SELECT id, note_text, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at FROM notes ORDER BY created_at DESC")
    notes = cur.fetchall()
    conn.close()
    
    return render_template_string(html_template, notes=notes)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
