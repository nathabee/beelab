'use client';

import React, { useMemo } from 'react';
import { Eleve } from '@mytypes/eleve';
import TeacherDisplay from './TeacherDisplay';

interface Props {
  student?: Eleve | null;
}

const StudentDisplay: React.FC<Props> = ({ student }) => {
  if (!student) return <p>No student selected.</p>;

  // Deduplicate teachers defensively
  const teachers = useMemo(() => {
    const seen = new Set<string | number>();
    return (student.professeurs_details || []).filter(p => {
      const key = (p.id ?? p.username) as string | number;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [student.professeurs_details]);

  return (
    <div>
      <h4>Selected Student</h4>
      <p>
        {student.nom} {student.prenom}, {student.niveau_description}, Birthdate: {student.datenaissance || '—'}
      </p>

      <h5>Teachers</h5>
      {teachers.length > 0 ? (
        <ul className="list-unstyled">
          {teachers.map(prof => (
            <li key={prof.id ?? prof.username}>
              <TeacherDisplay user={prof as any} />
            </li>
          ))}
        </ul>
      ) : (
        <p>No assigned teacher(s)</p>
      )}
    </div>
  );
};

export default StudentDisplay;
