/**
 * src/navigation/types.ts (mobile)
 * Navigation type definitions for TypeScript.
 */

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  ItemDetail: { itemId: string };
  CreateItem: undefined;
  MyItems: undefined;
  Requests: undefined;
  Profile: undefined;
};
