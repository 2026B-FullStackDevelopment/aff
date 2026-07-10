// Collects module interfaces when a feature needs to depend on another module safely.
const { userInterface } = require('../../modules/users/user.interface');
const { foodInterface } = require('../../modules/food/food.interface');
const { subscriptionInterface } = require('../../modules/subscriptions/subscription.interface');

module.exports = {
  userInterface,
  foodInterface,
  subscriptionInterface,
};
