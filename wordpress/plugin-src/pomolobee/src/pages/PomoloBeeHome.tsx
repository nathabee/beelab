// src/pages/PomoloBeeHome.tsx
// WordPress plugin entry page (home/landing)

'use client';

import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';

const FeatureCard: React.FC<{ title: string; children: React.ReactNode; emoji?: string }> = ({ title, children, emoji }) => (
  <div className="col-md-6 mb-3">
    <div className="card h-100">
      <div className="card-body">
        <h5 className="card-title">{emoji ? `${emoji} ` : ''}{title}</h5>
        <div className="card-text">{children}</div>
      </div>
    </div>
  </div>
);

const PomoloBeeHome: React.FC = () => {
  const navigate = useNavigate(); 
  const { isLoggedIn, user } = useUser();
  const { farms } = useApp();

  // Derived counts for a quick overview
  const farmsCount = farms?.length || 0;
  const fieldsCount = farms?.reduce((acc, f) => acc + (f.fields?.length || 0), 0) || 0;

  return (
    <div className="container my-4">
      {/* Header / CTA */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
        <div>
          <h2 className="mb-1">🍯 PomoloBee — Orchard Monitoring</h2>
          <p className="mb-0 text-muted">
            WordPress plugin powered by a Django REST API. Authenticate as a farmer, select your farm & fields,
            and manage orchard images, estimates, and history.
          </p>
        </div>

        <div className="d-flex gap-2">
          {!isLoggedIn ? (
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              🔐 Log in
            </button>
          ) : (
            <button className="btn btn-success" onClick={() => navigate('/dashboard')}>
              📊 Go to Dashboard
            </button>
          )}
        </div>
      </div>

      {/* User snapshot */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">👤 Status</h5>
          {!isLoggedIn ? (
            <p className="mb-0">You’re not logged in. Please use the button above to authenticate.</p>
          ) : (
            <>
              <p className="mb-2">
                Logged in as <strong>{user?.first_name} {user?.last_name}</strong> ({user?.username})
              </p>
              <div className="d-flex flex-wrap gap-3">
                <span className="badge text-bg-secondary">Farms: {farmsCount}</span>
                <span className="badge text-bg-secondary">Fields: {fieldsCount}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* If logged in: show a compact list of farms/fields */}
      {isLoggedIn && farmsCount > 0 && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">🏡 Your Farms & Fields</h5>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 200 }}>Farm</th>
                    <th>Fields</th>
                  </tr>
                </thead>
                <tbody>
                  {farms.map((farm) => (
                    <tr key={farm.farm_id}>
                      <td><strong>{farm.name}</strong></td>
                      <td>
                        {farm.fields?.length ? (
                          farm.fields.map((fld) => (
                            <span key={fld.field_id} className="badge text-bg-light me-2 mb-1">
                              {fld.short_name || fld.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted">No fields</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3">
              <button className="btn btn-outline-primary" onClick={() => navigate('/dashboard')}>
                Open Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature grid */}
      <div className="row">
        <FeatureCard title="Authenticate & Authorize" emoji="🔑">
          Use JWT-based login via the Django API. Farmers see their own farm; admins can view all farms.
        </FeatureCard>

        <FeatureCard title="Select Farm & Fields" emoji="🌾">
          The dashboard lists your farm(s) and fields. Choose a field to focus all actions and context.
        </FeatureCard>

        <FeatureCard title="Images & Estimation" emoji="📷">
          Attach images to rows, run yield estimation (ML/Manual), and keep track over time.
        </FeatureCard>

        <FeatureCard title="History & Reports" emoji="📈">
          Browse past estimations and visualize trends across dates, rows, and fruit types.
        </FeatureCard>
      </div>

      {/* Tech summary */}
      <div className="card mt-4">
        <div className="card-body">
          <h5 className="card-title">🛠️ Tech Overview</h5>
          <ul className="mb-0">
            <li><strong>Frontend (WP plugin):</strong> React + TypeScript + Bootstrap (enqueued by plugin)</li>
            <li><strong>Backend:</strong> Django REST API (JWT auth, routers, serializers)</li>
            <li><strong>Data:</strong> Farms with nested fields, rows, images, estimations</li>
            <li><strong>Security:</strong> Same-origin proxy or strict CORS (prod)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PomoloBeeHome;
