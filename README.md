# ParkSight AI

Build a complete, professional, production-style full-stack web application called “ParkSight AI”.

Project title:
“ParkSight AI – Intelligent Parking Space Detection, Monitoring & Availability Prediction System Using Statistics and Machine Learning”

The application should look like a modern AI SaaS dashboard, NOT like a basic college project. Use a clean, premium, responsive UI with excellent spacing, cards, charts, animations, icons, dark/light theme support, and mobile responsiveness.

1. TECHNOLOGY STACK

Frontend:

React

TypeScript

Tailwind CSS

Modern component architecture

Lucide icons

Recharts or another modern chart library

Backend:

Python Flask REST API

SQLite for development

SQLAlchemy ORM

AI/ML:

Python

Pandas

NumPy

Scikit-learn

OpenCV

YOLO/Ultralytics integration structure for vehicle detection

Authentication:

Secure user registration/login

Password hashing

Session/JWT-based authentication

User-specific data access

2. LANDING PAGE

Create a premium landing page for ParkSight AI.

Hero section:
“See. Analyze. Predict. Park Smarter.”

Subtitle:
“AI-powered parking monitoring, statistical analytics and intelligent availability prediction in one platform.”

Buttons:

Get Started

Login

Explore Demo

Sections:

How ParkSight AI works

AI Vehicle Detection

Real-Time Parking Monitoring

Statistical Analytics

Machine Learning Prediction

Smart Alerts

Features

Technology section

Footer

Use attractive parking/AI visual elements without making the page overly crowded.

3. USER AUTHENTICATION

Create:

Sign Up

Login

Logout

Forgot Password UI

User Profile

Registration fields:

Full Name

Email

Phone Number

Password

Confirm Password

After login, redirect the user to their own dashboard.

Never store plain-text passwords.

4. PARKING AREA SETUP

After first login, allow users to create a parking area.

Fields:

Parking Area Name

Location

Description

Total Capacity

Parking Type

Create an option:
“Configure Parking Camera”

Allow the user to upload a parking image/video or use browser camera access where supported.

Create a parking-slot configuration interface where the user can define/mark parking spaces on an image.

Each slot should have:

Slot ID

Slot Number

Coordinates/region

Status

Statuses:

Available

Occupied

Unknown

5. MAIN DASHBOARD

Create a professional dashboard with:

Header:

ParkSight AI logo/name

Search

Notifications

User profile

Sidebar:

Dashboard

Live Monitor

Parking Areas

Slot Management

Analytics

ML Prediction

Reports

Settings

Dashboard KPI cards:

Total Capacity

Available Slots

Occupied Slots

Occupancy Percentage

Peak Hour

Prediction Status

Example:

Total Capacity: 50
Available: 18
Occupied: 32
Occupancy: 64%

Add attractive parking status indicators.

6. PARKING SLOT VISUALIZATION

Create a visual parking layout.

Example:

P01 – Available
P02 – Occupied
P03 – Available
P04 – Occupied
P05 – Available
P06 – Occupied

Use clear visual status indicators.

Green = Available
Red = Occupied
Yellow = Unknown/Processing

Allow users to select a slot and view its details.

7. LIVE CAMERA MONITORING

Create a dedicated Live Monitor page.

Features:

Browser camera access

Start Camera

Stop Camera

Capture Snapshot

Full Screen

Camera status

FPS indicator

Detection count

Occupied slots

Available slots

Display the live camera/video area prominently.

Create a backend-ready computer vision pipeline:

Camera/video frame
→ OpenCV
→ YOLO vehicle detection
→ Parking slot region analysis
→ Occupied/Available classification
→ Database update
→ Dashboard update

IMPORTANT:
Do not falsely claim that browser camera access alone performs AI detection. Create a clear modular architecture so the actual YOLO/OpenCV backend can be connected.

If real YOLO inference cannot run directly in the generated environment, implement a realistic demo/mock detection mode and clearly label it as Demo Mode.

8. PARKING CAPACITY

Provide a parking capacity estimation/setup module.

Allow the user to:

Define total parking capacity

Configure individual parking slots

View current occupancy

View available capacity

Show:

Total Capacity

Current Occupied

Current Available

Occupancy %

Do not claim that a single camera can always determine exact physical parking capacity. Capacity should be configured or calibrated by the user.

9. STATISTICAL ANALYTICS

This is a major feature because the project is for Statistics for Machine Learning.

Create a complete analytics dashboard showing:

Mean occupancy

Median occupancy

Mode

Variance

Standard deviation

Occupancy percentage

Average vehicles per hour

Peak parking hour

Minimum occupancy

Maximum occupancy

Correlation analysis where applicable

Create interactive charts:

Hourly occupancy trend

Daily occupancy trend

Weekly occupancy trend

Available vs Occupied

Parking utilization

Peak-hour analysis

Allow date/time filtering.

10. MACHINE LEARNING PREDICTION

Create a Machine Learning Prediction page.

Inputs:

Date

Day of week

Time

Historical occupancy

Parking capacity

Optional weather/event features

Output:

Predicted Occupancy %

Predicted Occupied Vehicles

Predicted Available Slots

Availability Level

Levels:

LOW

MODERATE

HIGH

NEARLY FULL

Example output:

Predicted Occupancy: 86%
Predicted Occupied: 43
Predicted Available: 7
Status: NEARLY FULL

Use a suitable Scikit-learn model such as Random Forest or Logistic Regression depending on the prediction target.

Show:

Model accuracy

Training data size

Prediction confidence where appropriate

Feature importance

Do not invent fake accuracy. If using demo data, clearly label the result as demo/simulated.

11. DATABASE

Create proper relational database models.

Tables:

Users:

id

name

email

phone

password_hash

created_at

ParkingAreas:

id

user_id

area_name

location

description

capacity

created_at

ParkingSlots:

id

area_id

slot_number

coordinates

status

ParkingRecords:

id

area_id

timestamp

occupied

available

occupancy_percentage

Predictions:

id

area_id

prediction_time

predicted_occupancy

predicted_available

status

model_version

CameraSessions:

id

area_id

started_at

ended_at

detection_count

Make sure every user's parking data is isolated from other users.

12. SMART ALERTS

Create notifications for:

Parking nearly full

Occupancy above 90%

High predicted occupancy

Camera disconnected

Detection failure

Low availability

Example:
“Parking Area A is 92% occupied. Only 4 slots remain.”

13. REPORTS

Create a Reports page.

Allow users to view:

Daily report

Weekly report

Monthly report

Include:

Occupancy summary

Peak hours

Average occupancy

Available slot trends

Statistical metrics

ML prediction summary

Provide UI buttons for:

Export CSV

Export PDF

14. SETTINGS

Create:

User profile settings

Parking area settings

Camera settings

Notification settings

Theme settings

Model/demo settings

15. DEMO MODE

Because this is initially a student project, create a proper Demo Mode.

Demo Mode should:

Generate realistic parking occupancy data

Simulate parking slot changes

Populate charts

Demonstrate statistics

Demonstrate ML predictions

Show sample camera monitoring data

Clearly label simulated data as:
DEMO / SIMULATED DATA

Do NOT present simulated data as real camera detections.

16. UI/UX

Design requirements:

Professional AI SaaS dashboard

Responsive desktop/tablet/mobile layout

Modern typography

Consistent spacing

Rounded cards

Subtle shadows

Smooth transitions

Interactive hover states

Loading states

Empty states

Error states

Toast notifications

Accessible buttons/forms

Dark/light mode

Use a sophisticated blue/indigo-based technology aesthetic, but keep the interface clean and professional.

17. API STRUCTURE

Create backend API endpoints for:

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/user/profile

GET /api/parking-areas
POST /api/parking-areas
PUT /api/parking-areas/:id
DELETE /api/parking-areas/:id

GET /api/parking-areas/:id/slots
POST /api/parking-areas/:id/slots
PUT /api/parking-slots/:id

GET /api/parking-areas/:id/status
GET /api/parking-areas/:id/analytics
GET /api/parking-areas/:id/predictions

POST /api/ml/predict
POST /api/camera/start
POST /api/camera/stop

Structure the API cleanly and document the expected request/response formats.

18. PROJECT QUALITY

Do not create a single huge file.

Use reusable React components and modular backend services.

Include:

README.md

requirements.txt

package.json

.env.example

Database setup

API documentation

Clear comments for important AI/ML sections

Proper error handling

Input validation

Loading states

Responsive design

19. IMPORTANT IMPLEMENTATION RULE

Build the project in a way that it can actually be run locally.

First make:

Authentication

Dashboard

Parking area management

Parking slot visualization

Statistics

Database

ML demo prediction

Camera interface

AI detection integration structure

Reports

Do not leave major buttons non-functional.

If a real AI model cannot be executed in the current environment, implement a working Demo Mode and provide a clearly separated integration point for YOLO/OpenCV.

The final application should feel like a polished AI-powered Smart Parking Management SaaS product, suitable for a college project demonstration and viva, while remaining technically honest about simulated versus real camera/AI results.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d001ea0c-2159-491b-aaa3-19c6bbabea5e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
