// src/context/AppContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
 
import { FarmWithFields } from "@mytypes/farm";
import { Fruit } from '@mytypes/fruit';
import { Field, FieldBasic } from '@mytypes/field';
import type { Row } from '@mytypes/row'; 


type Maybe<T> = T | null;

type AppContextType = {
 

  reset: () => void;
  // domain
  farms: FarmWithFields[];
  setFarms: (f: FarmWithFields[]) => void;

  fields: Field[];                         // full field records
  setFields: (f: Field[]) => void;
  fieldsById: Record<number, Field>;       // quick lookup
  patchField: (fieldId: number, patch: Partial<Field>) => void;


  rows: Row[];
  setRows: (r: Row[]) => void;
  rowsByFieldId: Record<number, Row[]>;
  getFieldWithRows: (fieldId: number) => (Field & { rows: Row[] }) | null;



  fruits: Fruit[];
  setFruits: (f: Fruit[]) => void;

  activeFarm: Maybe<FarmWithFields>;
  setActiveFarm: (f: Maybe<FarmWithFields>) => void;

  activeField: Maybe<FieldBasic | Field>;
  setActiveField: (f: Maybe<FieldBasic | Field>) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => { 
  const [farms, setFarmsState] = useState<FarmWithFields[]>([]);
  const [activeFarm, setActiveFarmState] = useState<Maybe<FarmWithFields>>(null);
  const [activeField, setActiveFieldState] = useState<Maybe<FieldBasic | Field>>(null);
  const [fields, setFieldsState] = useState<Field[]>([]);
  const [fruits, setFruitsState] = useState<Fruit[]>([]);
  const [rows, setRowsState] = useState<Row[]>([]);

  const fieldsById = useMemo(
    () => Object.fromEntries(fields.map(f => [f.field_id, f])),
    [fields]
  ); 

  const patchField = (fieldId: number, patch: Partial<Field>) => {
    setFieldsState(prev => prev.map(f => (f.field_id === fieldId ? { ...f, ...patch } : f)));
    setActiveFieldState(prev => {
      if (!prev) return prev;
      const fid = (prev as any).field_id;
      const isFull = (prev as any).orientation !== undefined;
      return isFull && fid === fieldId ? { ...(prev as Field), ...patch } : prev;
    });
  };
  const rowsByFieldId = useMemo(() => {
    const map: Record<number, Row[]> = {};
    for (const r of rows) {
      if (!map[r.field_id]) map[r.field_id] = [];
      map[r.field_id].push(r);
    }
    return map;
  }, [rows]);

  const getFieldWithRows = (fieldId: number) => {
    const f = fields.find(x => x.field_id === fieldId);
    if (!f) return null;
    return { ...f, rows: rowsByFieldId[fieldId] ?? [] };
  };



 

  useEffect(() => {
    console.log('[App] DEBUG farms set:', farms);
  }, [farms]);

  useEffect(() => {
    console.log('[App] DEBUG fields set:', fields);
  }, [fields]);

  useEffect(() => {
    console.log('[App] DEBUG fruits set:', fruits);
  }, [fruits]);

  useEffect(() => {
    console.log('[App] rows set length:', rows.length, 'sample:', rows.slice(0, 3));
  }, [rows]);

  useEffect(() => {
    const ids = Array.from(new Set(rows.map(r => r.field_id)));
    console.log('[App] rowsByFieldId keys:', ids);
  }, [rows]);

  // END DEBUG


  useEffect(() => {
    console.log('[App] activeFarm:', activeFarm, 'activeField:', activeField);
  }, [activeFarm, activeField]);

  // boot from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fs = localStorage.getItem("farms");
    const af = localStorage.getItem("activeFarm");
    const fld = localStorage.getItem("activeField");



    if (fs) setFarmsState(JSON.parse(fs));
    if (af) setActiveFarmState(JSON.parse(af));
    if (fld) setActiveFieldState(JSON.parse(fld));
  }, []);




  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("fields", JSON.stringify(fields));
    localStorage.setItem("fruits", JSON.stringify(fruits));
  }, [fields, fruits]);


  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("farms", JSON.stringify(farms));
  }, [farms]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeFarm) localStorage.setItem("activeFarm", JSON.stringify(activeFarm));
    else localStorage.removeItem("activeFarm");
  }, [activeFarm]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeField) localStorage.setItem("activeField", JSON.stringify(activeField));
    else localStorage.removeItem("activeField");
  }, [activeField]);



  const reset = () => {
    
    setFarmsState([]);
    setFieldsState([]);
    setRowsState([]);   
    setFruitsState([]);
    setActiveFarmState(null);
    setActiveFieldState(null);

      if (typeof window !== 'undefined') {
    [
      'farms',
      'fields',
      'fruits',
      'rows',
      'activeFarm',
      'activeField',
    ].forEach(k => localStorage.removeItem(k));
  }

  console.log('[AppProvider] logout called');
};

  const setFarms = (f: FarmWithFields[]) => setFarmsState(f);
  const setActiveFarm = (f: Maybe<FarmWithFields>) => {
    setActiveFarmState(f);
    // when switching farm, clear field selection
    setActiveFieldState(null);
  };
  const setActiveField = (f: Maybe<FieldBasic | Field>) => setActiveFieldState(f);

  // expose setters
  const setFields = (f: Field[]) => setFieldsState(f);
  const setFruits = (f: Fruit[]) => setFruitsState(f);

  //row 



  // boot from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rs = localStorage.getItem('rows');
    if (rs) setRowsState(JSON.parse(rs));
  }, []);

  // persist
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('rows', JSON.stringify(rows));
  }, [rows]);

  // setters to expose
  const setRows = (r: Row[]) => setRowsState(r);


  return (
    <AppContext.Provider value={{
      reset, 
      farms, setFarms,
      activeFarm, setActiveFarm,
      activeField, setActiveField,
      fields, setFields,
      fieldsById,
      patchField,
      rows, setRows,
      getFieldWithRows,
      rowsByFieldId,
      fruits, setFruits

    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
