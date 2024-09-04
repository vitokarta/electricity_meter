app.get('/test-bcrypt', async (req, res) => {
    const password = '123456789';
    const hashedPassword = await bcrypt.hash(password, 10);
    const isMatch = await bcrypt.compare(password, hashedPassword);
    res.json({ hashedPassword, isMatch });
  });