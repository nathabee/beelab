// shared/index.ts
export * from './error';
export * from './widgets'; // if you added TranslateBox
export * from './user/components'; // now it resolves to the new index.ts
export * from './user'; 
export { default } from './user/pages/UserLogin';  