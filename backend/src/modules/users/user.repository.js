// Contains user database queries so services do not call Mongoose directly.
const User = require('./user.model');

function createUser(data) {
  return User.create(data);
}

function findUserByEmail(email) {
  return User.findOne({ email }).lean();
}

function findUserById(id) {
  return User.findById(id).lean();
}

function updateUser(id, data) {
  return User.findByIdAndUpdate(id, data, { new: true }).lean();
}

module.exports = { createUser, findUserByEmail, findUserById, updateUser };
