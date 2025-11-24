// pomolobee/src/pages/CompetenceLogin.tsx (your snippet renamed to UserMgt page)
import React from 'react';
import { UserMgt } from '@bee/common';

// plugin-specific injections
import useBootstrapData from '@hooks/useBootstrapData';
import { apiUser } from '@utils/api';

const CompetenceUserMgt: React.FC = () => {
  return (
    <UserMgt
      plugin="competence"
      usePluginBootstrap={useBootstrapData}
      usePluginApis={() => ({ apiUser })}
    />
  );
};

export default CompetenceUserMgt;
