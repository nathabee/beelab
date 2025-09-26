// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { User } from "@mytypes/user";
import { FarmWithFields } from "@mytypes/farm";
import { Fruit } from '@mytypes/fruit';
import { Field, FieldBasic } from '@mytypes/field';
import type { Row } from '@mytypes/row';
import { isTokenExpired } from '@utils/jwt';


type Maybe<T> = T | null;

type AuthContextType = {
  // auth
  token: Maybe<string>;
  user: Maybe<User>;
  isLoggedIn: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setToken: (t: Maybe<string>) => void;


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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<Maybe<string>>(null);
  const [user, setUser] = useState<Maybe<User>>(null);
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
  const isLoggedIn = !!token;

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



  // DEBUG
  useEffect(() => {
    console.log('[Auth] DEBUG token changed:', token);
  }, [token]);

  useEffect(() => {
    console.log('[Auth] DEBUG user changed:', user);
  }, [user]);

  useEffect(() => {
    console.log('[Auth] DEBUG farms set:', farms);
  }, [farms]);

  useEffect(() => {
    console.log('[Auth] DEBUG fields set:', fields);
  }, [fields]);

  useEffect(() => {
    console.log('[Auth] DEBUG fruits set:', fruits);
  }, [fruits]);

  useEffect(() => {
    console.log('[Auth] rows set length:', rows.length, 'sample:', rows.slice(0, 3));
  }, [rows]);

  useEffect(() => {
    const ids = Array.from(new Set(rows.map(r => r.field_id)));
    console.log('[Auth] rowsByFieldId keys:', ids);
  }, [rows]);

  // END DEBUG


  useEffect(() => {
    console.log('[Auth] activeFarm:', activeFarm, 'activeField:', activeField);
  }, [activeFarm, activeField]);

  // boot from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem("authToken");
    const u = localStorage.getItem("userInfo");
    const fs = localStorage.getItem("farms");
    const af = localStorage.getItem("activeFarm");
    const fld = localStorage.getItem("activeField");

    // manage token expiricy
    if (t) {
      // If expired at boot, purge immediately
      if (isTokenExpired(t)) {
        localStorage.removeItem('authToken');
      } else {
        setTokenState(t);
      }
    }


    if (u) setUser(JSON.parse(u));
    if (fs) setFarmsState(JSON.parse(fs));
    if (af) setActiveFarmState(JSON.parse(af));
    if (fld) setActiveFieldState(JSON.parse(fld));
  }, []);


  // runtime token guard: clear when token expires (poll every 30s)
  useEffect(() => {
    if (!token) return;
    if (isTokenExpired(token)) {
      setTokenState(null);
      return;
    }
    const id = setInterval(() => {
      setTokenState(prev => {
        if (prev && isTokenExpired(prev)) return null;
        return prev;
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [token]);

  // respond to storage changes from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        const newToken = e.newValue;
        if (!newToken || isTokenExpired(newToken)) {
          setTokenState(null);
        } else {
          setTokenState(newToken);
        }
      }
      if (e.key === 'userInfo') {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);


  // persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (token)
      localStorage.setItem("authToken", token);
    else localStorage.removeItem("authToken");
  }, [token]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("fields", JSON.stringify(fields));
    localStorage.setItem("fruits", JSON.stringify(fruits));
  }, [fields, fruits]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user) localStorage.setItem("userInfo", JSON.stringify(user));
    else localStorage.removeItem("userInfo");
  }, [user]);

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

  const login = (tok: string, u: User) => {
    setTokenState(tok);
    setUser(u);
    console.log('[AuthProvider] login called');
  };

  const logout = () => {
    setTokenState(null);
    setUser(null);
    setFarmsState([]);
    setFieldsState([]);
    setRowsState([]);   
    setFruitsState([]);
    setActiveFarmState(null);
    setActiveFieldState(null);

      if (typeof window !== 'undefined') {
    [
      'authToken',
      'userInfo',
      'farms',
      'fields',
      'fruits',
      'rows',
      'activeFarm',
      'activeField',
    ].forEach(k => localStorage.removeItem(k));
  }

  console.log('[AuthProvider] logout called');
};

  const setToken = (t: Maybe<string>) => setTokenState(t);
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
    <AuthContext.Provider value={{
      token, user, isLoggedIn, login, logout, setToken,
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
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
