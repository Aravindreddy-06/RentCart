import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: { message?: string } | undefined;
  Register: undefined;
  VerifyEmail: { email: string };
  ForgotPassword: undefined;
  ResetPassword: { email?: string; infoMessage?: string } | undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  RequestsTab: undefined;
  MessagesTab: undefined;
  MyRentalsTab: undefined;
  ProfileTab: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Home: NavigatorScreenParams<MainTabParamList> | undefined;
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
  PublicProfile: { userId: string };
  Notifications: undefined;
  Chat: { rentalId: string; otherUserName?: string; title?: string };
};
