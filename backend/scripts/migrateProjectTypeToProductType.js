import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    const productsCollection = db.collection('products');

    const result = await productsCollection.updateMany(
      { project_type: { $exists: true } },
      [
        {
          $set: {
            product_type: '$project_type',
          },
        },
        {
          $unset: ['project_type'],
        },
      ]
    );

    console.log(`Migration complete:`);
    console.log(`  - Matched: ${result.matchedCount} records`);
    console.log(`  - Modified: ${result.modifiedCount} records`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
