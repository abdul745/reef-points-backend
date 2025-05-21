import * as bcrypt from 'bcrypt';

async function hashPassword() {
  const password = 'admin123';
  const saltRounds = 10;

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Hashed password:', hashedPassword);
  } catch (error) {
    console.error('Error hashing password:', error);
  }
}

hashPassword();