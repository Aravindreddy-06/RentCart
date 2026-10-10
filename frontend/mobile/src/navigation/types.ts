/**
 * src/navigation/types.ts (mobile)
 * Navigation type definitions for TypeScript.
 */

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  Home: undefined;
  ItemDetail: { itemId: string };
  AddItem: undefined;
  RentalDetail: { rentalId: string };
  RequestBorrow: {
    itemId: string;
    title: string;
    pricePerDay: number;
    deposit: number;
    ownerName: string;
  };
  CreateItem: undefined;
  MyItems: undefined;
  Requests: undefined;
  Profile: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  RequestsTab: undefined;
  MyRentalsTab: undefined;
  ProfileTab: undefined;
};
