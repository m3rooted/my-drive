const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Simple in-memory storage (replace with database in production)
class User {
  constructor() {
    this.users = [];
  }

  async create(userData) {
    const { email, password, name } = userData;
    
    // Check if user already exists
    const existingUser = this.users.find(user => user.email === email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      createdAt: new Date(),
      rootFolderId: uuidv4() // Each user gets a root folder
    };

    this.users.push(user);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  async findById(id) {
    const user = this.users.find(user => user.id === id);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  async validatePassword(user, password) {
    return await bcrypt.compare(password, user.password);
  }
}

module.exports = new User();
