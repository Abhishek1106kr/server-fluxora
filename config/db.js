import mongoose from "mongoose";

mongoose.set('strictPopulate', false);

const connectDB = async () => {
    mongoose.connection.on('connected', () => { console.log("MongoDB is connected") });
    await mongoose.connect(`${process.env.MONGODB_URL}/auth`);
};


export default connectDB;
