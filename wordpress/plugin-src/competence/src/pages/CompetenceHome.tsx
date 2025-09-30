// src/pages/CompetenceHome.tsx
// for wordpress only

// src/pages/CompetenceHome.tsx
import React from 'react';

const CompetenceHome = () => (
  <div className="container">

    <h2>🧩 WordPress Plugin for Evaluation Project</h2>

    <p>
      This WordPress plugin embeds a modern <strong>React single-page application</strong> directly inside a WordPress page.
      It demonstrates how a dynamic frontend (built with React, TypeScript, and CSS) can be integrated with a traditional WordPress environment, while communicating securely with a <strong>Django-based REST API backend</strong>.
    </p>
    <p>
      The goal is to offer a seamless user experience for educators, by combining the familiar content management of WordPress with powerful, interactive tools designed for evaluating early childhood competencies.
    </p>


    <h2>🏫 Overview of the Kindergarten Evaluation Project</h2>
    <p>
      This project aims to create a platform similar to the one used by French professors for evaluating the developmental level of kindergarten students. The purpose of these evaluations is to identify students who may need additional support in early education.
    </p>
    <p>The platform is designed to assist teachers in assessing key competencies, including:</p>
    <ul>
      <li>Language comprehension and vocabulary</li>
      <li>Basic mathematical understanding</li>
      <li>Logical thinking and problem-solving skills</li>
    </ul>
    <p>
      The system allows teachers to enter students' results into a user-friendly interface, compare them with thresholds, and generate reports that highlight areas where additional support is needed.
    </p>

    <h3>🔧 Key Technologies</h3>
    <ul>
      <li><strong>Frontend:</strong> React, CSS, and TypeScript</li>
      <li><strong>Backend:</strong> Python with Django</li>
      <li><strong>Database:</strong> MySQL</li>
      <li><strong>API Docs:</strong> Swagger</li>
    </ul>



    <div className="flex-container">
 
      <div className="flex-item info-container">
        <img src="https://img.shields.io/badge/status-work%20in%20progress-yellow" alt="Work In Progress" />
        <h2>⚠️ Work In Progress</h2>
        <p><strong>This project is currently under development and is not yet stable.</strong></p>
        <ul>
          <li><strong>Features:</strong> Not all planned features are implemented yet.</li>
          <li><strong>Stability:</strong> There may be bugs and incomplete functionalities.</li>
          <li><strong>Documentation:</strong> Work in progress.</li>
        </ul>

        <p>
          GitHub source:{" "}
          <a href="https://github.com/nathabee/competence_project" target="_blank" rel="noopener noreferrer">
            GitHub Repo
          </a>
        </p>

        <p>
          Demo version on GitHub Pages:{" "}
          <a href="https://nathabee.github.io/competence_project/" target="_blank" rel="noopener noreferrer">
            GitHub Page Demo
          </a>
        </p>
        <p>This static demo uses mocked APIs but reflects the actual frontend design.</p>
      </div>
    </div>

    <h3>🛠 Technical Overview</h3>
    <p>
      The project helps assess kindergarten students' progress using modern tech. Radar diagrams will visualize competencies like language, math, and reasoning.
    </p>

    <h4>Frontend</h4>
    <p>
      Built with React and TypeScript. Teachers enter data, which is visualized using tools like Chart.js.
    </p>

    <h4>Backend</h4>
    <p>
      Django powers the backend, offering a secure API for user auth, data input, and result processing.
    </p>
    <ul>
      <li>
        Static API spec:{" "}
        <a href="https://nathabee.de/static/html/swagger_json.html" target="_blank" rel="noopener noreferrer">
          Swagger JSON
        </a>
      </li>
    </ul>

    <h4>Database</h4>
    <p>
      MySQL stores all student and evaluation data, allowing longitudinal tracking and secure access.
    </p>

    <h4>Visualization</h4>
    <p>
      Radar diagrams (e.g., via Chart.js) provide a fast overview of student skills and support needs.
    </p>
  </div>
);

export default CompetenceHome;
