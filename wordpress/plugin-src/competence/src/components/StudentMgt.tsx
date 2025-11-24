'use client';

import React, { useState } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import { useApp } from '@context/AppContext';
import { useStudents } from '@hooks/useStudents';
import StudentSelection from '@components/StudentSelection';
import StudentForm from '@components/StudentForm';
import StudentDisplay from '@components/StudentDisplay';
import { useProtectedPage } from  '@bee/common'; 

const StudentMgt = () => {
  const { activeEleve, reset } = useApp();
  const { students, loading, error, setStudents } = useStudents();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const filtered = students.filter(s =>
    `${s.nom} ${s.prenom}`.toLowerCase().includes(search.toLowerCase())
  );


  useProtectedPage(() => reset()); // handles token check + redirect

  return (
    <div className="container mt-3">
      <h1>Student Management</h1>

      {loading && (
        <div className="mt-4">
          <Spinner animation="border" /> Loading students...
        </div>
      )}

      {error && (
        <div className="alert alert-danger mt-3">
          Failed to load students.
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="my-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search by name"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <StudentSelection eleves={filtered} />

          <div className="my-4">
            {activeEleve ? (
              <StudentDisplay student={activeEleve} />
            ) : (
              <p>No student selected.</p>
            )}
          </div>

          <button className="btn btn-primary mb-3" onClick={() => setFormOpen(true)}>
            Add Student
          </button>

          {formOpen && (
            <div className="card p-3">
              <StudentForm setStudents={setStudents} closeForm={() => setFormOpen(false)} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentMgt;
