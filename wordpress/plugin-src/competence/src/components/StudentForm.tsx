'use client';

import React, { useEffect, useState } from 'react';
import { Eleve } from '@mytypes/eleve';
import { User } from '@mytypes/user';
import { useApp } from '@context/AppContext';
import { useUser } from '@bee/common';
import { apiUser, apiApp, authHeaders } from '@utils/api';

interface StudentFormProps {
  setStudents: React.Dispatch<React.SetStateAction<Eleve[]>>;
  closeForm: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ setStudents, closeForm }) => {
  const { user, token } = useUser();
  const { niveaux } = useApp();
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [level, setLevel] = useState(''); // store string; cast to number on submit
  const [birthDate, setBirthDate] = useState(
    new Date(new Date().setFullYear(new Date().getFullYear() - 5))
      .toISOString()
      .split('T')[0]
  );
  const [availableTeachers, setAvailableTeachers] = useState<User[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const isAdmin = !!user?.roles.includes('admin');

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!token || !isAdmin) return;

      try {
        // Axios style
        const res = await apiUser.get('/users/', {
          params: { role: 'teacher' },
          headers: authHeaders(token),
        });
        const data: User[] = res.data;
        setAvailableTeachers(data);
      } catch (e: any) {
        console.error('Failed to load teachers', e?.response?.status, e?.response?.data || e);
      }
    };

    fetchTeachers();
  }, [isAdmin, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const payload: any = {
      nom: lastName,
      prenom: firstName,
      niveau: level ? Number(level) : undefined, // FK id
      datenaissance: birthDate,                  // YYYY-MM-DD
    };

    if (isAdmin && selectedTeachers.length) {
      payload.professeurs = selectedTeachers.map((id) => Number(id));
    }

    try {
      // Axios style
      const res = await apiApp.post('/eleves/', payload, {
        headers: authHeaders(token),
      });

      const newStudent: Eleve = res.data;
      setStudents((prev) => [...prev, newStudent]);
      closeForm();
    } catch (err: any) {
      // Axios error details
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error('Failed to create student', status, data || err);
      alert(`Failed to create student. ${status ? `HTTP ${status}` : ''}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create a Student</h2>

      <input
        className="form-control mb-2"
        type="text"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Last Name"
        required
      />

      <input
        className="form-control mb-2"
        type="text"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="First Name"
        required
      />

      <select
        className="form-control mb-2"
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        required
      >
        <option value="" disabled>
          Select Level
        </option>
        {niveaux?.map((n) => (
          <option key={n.id} value={n.id}>
            {n.description}
          </option>
        ))}
      </select>

      <input
        className="form-control mb-2"
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        required
      />

      {isAdmin && (
        <select
          className="form-control mb-3"
          multiple
          value={selectedTeachers}
          onChange={(e) =>
            setSelectedTeachers(Array.from(e.target.selectedOptions, (opt) => opt.value))
          }
        >
          {availableTeachers.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.first_name} {t.last_name}
            </option>
          ))}
        </select>
      )}

      <button className="btn btn-primary" type="submit">
        Create Student
      </button>
    </form>
  );
};

export default StudentForm;
