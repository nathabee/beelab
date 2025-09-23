'use client';

import React, { useEffect, useState } from 'react';
import { Eleve } from '@mytypes/eleve';
import { User } from '@mytypes/user';
import { useAuth } from '@context/AuthContext';
import { getToken, isTokenExpired } from '@utils/jwt';
import { apiUser, apiComp, authHeaders } from '@utils/api';

interface StudentFormProps {
  setStudents: React.Dispatch<React.SetStateAction<Eleve[]>>;
  closeForm: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ setStudents, closeForm }) => {
  const { user, niveaux } = useAuth();
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [level, setLevel] = useState(''); // will store string, convert to number when posting
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
      const token = getToken();
      if (!token || isTokenExpired(token) || !isAdmin) return;

      try {
        const res = await apiUser(`/users/?role=teacher`, {
          headers: authHeaders(token),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: User[] = await res.json();
        setAvailableTeachers(data);
      } catch (e) {
        console.error('Failed to load teachers', e);
      }
    };

    fetchTeachers();
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token || isTokenExpired(token)) return;

    // Build payload expected by DRF
    const payload: any = {
      nom: lastName,
      prenom: firstName,
      niveau: level ? Number(level) : undefined, // PrimaryKeyRelatedField expects ID
      datenaissance: birthDate,                 // YYYY-MM-DD is good
    };

    // Admin can explicitly set professeurs (array of PKs)
    if (isAdmin && selectedTeachers.length) {
      payload.professeurs = selectedTeachers.map((id) => Number(id));
    }
    // For teacher: backend auto-assigns the current user in perform_create/serializer

    try {
      const res = await apiComp(`/eleves/`, {
        method: 'POST',
        headers: {
          ...authHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Create failed: ${res.status} ${res.statusText} - ${text}`);
      }

      const newStudent: Eleve = await res.json();
      setStudents((prev) => [...prev, newStudent]);
      closeForm();
    } catch (err) {
      console.error('Failed to create student', err);
      alert('Failed to create student. See console for details.');
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
