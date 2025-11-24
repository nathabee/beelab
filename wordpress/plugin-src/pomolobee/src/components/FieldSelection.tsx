// src/components/FieldSelection.tsx
'use client';

import React, { useMemo, useState } from "react";

 
import { useApp } from '@context/AppContext';

import { FieldBasic } from "@mytypes/field";

const FieldSelection: React.FC = () => {
  const { farms, activeFarm, setActiveFarm, activeField, setActiveField } = useApp();
  const [farmFilter, setFarmFilter] = useState<number | "">("");

  const farmOptions = farms;
  const fieldsForSelectedFarm: FieldBasic[] = useMemo(() => {
    const f = farmFilter
      ? farmOptions.find(x => x.farm_id === Number(farmFilter))
      : activeFarm || farmOptions[0];
    return f?.fields ?? [];
  }, [farmFilter, farmOptions, activeFarm]);


  console.log('[FieldSelection] component called');

  const onPickFarm = (farmIdStr: string) => {
    const id = farmIdStr ? Number(farmIdStr) : undefined;
    const farm = id ? farms.find(f => f.farm_id === id) || null : null;
    setActiveFarm(farm || null);
    setActiveField(null);
    setFarmFilter(farmIdStr ? id! : "");
  };
 
  if (!farmOptions.length) {
    return <div className="alert alert-info">No farms available.</div>;
  }

  return (
    <div className="card p-3 mb-3">
      <h3>🏞️ Select Field</h3>

      <div className="row g-2 mb-3">
        <div className="col-sm-6">
          <label className="form-label">Farm</label>
          <select
            className="form-select"
            value={farmFilter}
            onChange={e => onPickFarm(e.target.value)}
          >
            {farmOptions.map(f => (
              <option key={f.farm_id} value={f.farm_id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <table className="table table-hover">
        <thead>
          <tr>
            <th>Short</th>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {fieldsForSelectedFarm.map(field => (
            <tr
              key={field.field_id}
              onClick={() => setActiveField(field)}
              style={{ cursor: "pointer" }}
              className={activeField && "field_id" in activeField && activeField.field_id === field.field_id ? "table-primary" : ""}
            >
              <td>{field.short_name}</td>
              <td>{field.name}</td>
              <td>{field.description}</td>
            </tr>
          ))}
          {fieldsForSelectedFarm.length === 0 && (
            <tr><td colSpan={3} className="text-muted">No fields for this farm.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FieldSelection;
