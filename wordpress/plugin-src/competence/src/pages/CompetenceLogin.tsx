// pomolobee/src/pages/CompetenceLogin.tsx
'use client';

import React from 'react';
import { UserLogin } from '@bee/common';

// plugin-specific injections
import useBootstrapData from '@hooks/useBootstrapData';
import { apiUser } from '@utils/api';

const CompetenceLogin: React.FC = () => {
  return (
    <UserLogin
      plugin="competence"
      initialDemoRoles={['teacher']}          // set your default demo roles for PomoloBee
      usePluginBootstrap={useBootstrapData}   // plugin-local bootstrap hook
      usePluginApis={() => ({ apiUser })}     // inject this plugin's apiUser client
    />
  );
};

export default CompetenceLogin;
 