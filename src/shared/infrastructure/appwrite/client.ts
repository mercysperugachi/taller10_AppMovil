import { Client, Account, Databases, Storage } from 'react-native-appwrite';

export const client = new Client();

client
    .setEndpoint('https://nyc.cloud.appwrite.io/v1') // endpoint 
    .setProject('6a17a83e003ca36be508'); // ID del proyecto

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Centralizamos los IDs para que sea fácil llamarlos desde los repositorios
export const APPWRITE_CONFIG = {
    databaseId: '6a17a8af0017749581eb',
    profilesCollectionId: 'profiles',
    roomsCollectionId: 'rooms',
    messagesCollectionId: 'messages',
    storageBucketId: '6a17aa3a0012dfd8efc5'
};