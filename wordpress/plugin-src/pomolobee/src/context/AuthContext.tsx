// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState,useMemo } from "react";
import { User } from "@mytypes/user";
import { FarmWithFields } from "@mytypes/farm"; 
import { Fruit } from '@mytypes/fruit';
import { Field, FieldBasic } from '@mytypes/field'; 


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
  const [fields, setFieldsState]   = useState<Field[]>([]);
  const [fruits, setFruitsState]   = useState<Fruit[]>([]);

  const fieldsById = useMemo(
    () => Object.fromEntries(fields.map(f => [f.field_id, f])),
    [fields]
  );
  const isLoggedIn = !!token; 

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

    if (t) setTokenState(t);
    if (u) setUser(JSON.parse(u));
    if (fs) setFarmsState(JSON.parse(fs));
    if (af) setActiveFarmState(JSON.parse(af));
    if (fld) setActiveFieldState(JSON.parse(fld));
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
    setActiveFarmState(null);
    setActiveFieldState(null);
    if (typeof window !== "undefined") {
      localStorage.clear(); // simple reset for MVP
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

  return (
    <AuthContext.Provider value={{
      token, user, isLoggedIn, login, logout, setToken,
      farms, setFarms,
      activeFarm, setActiveFarm,
      activeField, setActiveField,
      fields, setFields, 
      fieldsById, 
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
