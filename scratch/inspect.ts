import * as firestore from "firebase/firestore";
console.log("descriptor:", Object.getOwnPropertyDescriptor(firestore, "doc"));
console.log("has doc:", "doc" in firestore);
console.log("typeof doc:", typeof firestore.doc);
