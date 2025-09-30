'use client';

import React from 'react';
import { Eleve } from '@mytypes/eleve';
import { UserDisplay } from '@bee/common';


interface Props {
  student?: Eleve | null;
}

const StudentDisplay: React.FC<Props> = ({ student }) => {
  if (!student) return <p>No student selected.</p>;

  return (
    <div>
      <h4>Selected Student</h4>
      <p>
        {student.nom} {student.prenom}, {student.niveau_description}, Birthdate: {student.datenaissance}
      </p>
      <h5>Teachers</h5>
      {student.professeurs_details.length > 0 ? (
        <ul>
          {student.professeurs_details.map(prof => (
            <li key={prof.id}><UserDisplay user={prof} /></li>
          ))}
        </ul>
      ) : (
        <p>No assigned teacher(s)</p>
      )}
    </div>
  );
};

export default StudentDisplay;
