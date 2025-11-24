#!/bin/bash

set -e  # Exit on any error
 
# 🛑 Ensure Flask not already running
echo "🧹 Killing any Flask using port 5000..."
fuser -k 5000/tcp 2>/dev/null || true

# 1. 🔴 UNAVAILABILITY TESTS ----------------------
echo "🔴 Running unavailability tests..."
 
source venv/bin/activate
python manage.py test core.tests.test_ml_unavailable
deactivate


# 2. ✅ START FLASK MOCK TESTS-- with mok_short.json -------
echo "✅ Starting Flask mock server for unit test mk bypass ML response..."

cd "../PomoloBeeML" || exit 1
source venv/bin/activate
 
echo "🧪 Starting Flask in MOK without answering with POST from ML to Django"

python app.py mok_short &
FLASK_PID=$!
sleep 2

# ✅ Test if Flask is up
if ! curl -s http://127.0.0.1:5000/ml/version >/dev/null; then
    echo "❌ Flask mock did not start properly"
    kill $FLASK_PID
    exit 1
fi
deactivate


# 3. ✅ DJANGO UNIT & WORKFLOW TESTS --------------
echo "✅ Running Django unit  tests..."

cd "../PomoloBeeDjango" || exit 1
source venv/bin/activate

python manage.py test core.tests.test_migration
python manage.py test core.tests.test_ml_response
python manage.py test core.tests.test_endpoint
python manage.py test core.tests.test_workflow 
 



# 4. ✅ START FLASK MOCK TESTS-- with mok.json -------

# 🛑 Ensure Flask not already running
echo "🧹 Killing any Flask using port 5000..."
fuser -k 5000/tcp 2>/dev/null || true


echo "✅ Starting Flask mock server for integration..."

cd "../PomoloBeeML" || exit 1
source venv/bin/activate
 
echo "🧪 Starting Flask in MOK using runserver"

python app.py mok &
FLASK_PID=$!
sleep 2

# ✅ Test if Flask is up
if ! curl -s http://127.0.0.1:5000/ml/version >/dev/null; then
    echo "❌ Flask mock did not start properly"
    kill $FLASK_PID
    exit 1
fi
deactivate



# 5. 📸 INTEGRATION SNAPSHOT TEST -----------------



cd "../PomoloBeeDjango" || exit 1
source venv/bin/activate
echo "📸 Running non-regression snapshot integration tests..."
pwd
./tests/integration_test.sh --nonreg
deactivate


# 5. 🛑 STOP FLASK MOCK ---------------------------
echo "🛑 Stopping Flask mock server..."
kill $FLASK_PID

 

### pb analyse list
# endpoint
#  /api/images/8/estimations/ not found
