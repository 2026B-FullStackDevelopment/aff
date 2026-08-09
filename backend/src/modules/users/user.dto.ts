// Shapes user data before sending it to the frontend or another module.
function toUserDto(user) {
  if (!user) return null;

  return {
    id: String(user._id || user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    isPremium: Boolean(user.isPremium),
  };
}

export { toUserDto };
