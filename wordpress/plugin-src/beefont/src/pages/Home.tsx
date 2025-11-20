// src/pages/BeeFontHome.tsx
//
// Minimal landing page for the BeeFont template plugin.
// It shows the current user (if any) and runs a simple /hello/ call
// against the UserCore API using apiApp.

import React, { useEffect, useState } from 'react';
import { useUser } from '@bee/common';
import { apiApp } from '@utils/api';

const Home: React.FC = () => {
  const { isLoggedIn, user } = useUser(); 
 

  return (
    <div className="bee-beefont-home">
      <section className="mb-4">
        <h2 className="h4">BeeFont HOME</h2>
        <p>
          This page is a minimal example of a BeeLab WordPress plugin frontend.
          It uses the shared authentication layer and talks to the Django UserCore API.
        </p>
      </section>

      <section className="mb-4">
        <h3 className="h5">Current user</h3>
        {isLoggedIn ? (
          <pre className="bg-light p-2 small rounded border">
            {JSON.stringify(user, null, 2)}
          </pre>
        ) : (
          <p>
            You are not logged in. Use the <code>/login</code> route to start a standard or demo session.
          </p>
        )}
      </section>
  
    </div>
  );
};

export default Home;
