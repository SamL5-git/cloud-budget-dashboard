import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";
import { supabase } from "./supabaseClient";

function App() {
  const [session, setSession] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Fuel");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      fetchExpenses();
    }
  }, [session]);

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Account created. Check your email if confirmation is required.");
    }
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setExpenses([]);
  }

  async function fetchExpenses() {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log("Error fetching:", error);
    } else {
      setExpenses(data);
    }
  }

  async function addExpense(e) {
    e.preventDefault();

    if (!name || !amount || !session) return;

    const { error } = await supabase.from("expenses").insert([
      {
        name,
        amount: Number(amount),
        category,
        user_id: session.user.id,
      },
    ]);

    if (error) {
      console.log("Error adding:", error);
    } else {
      setName("");
      setAmount("");
      fetchExpenses();
    }
  }

  async function deleteExpense(id) {
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("Error deleting:", error);
    } else {
      fetchExpenses();
    }
  }

  const total = expenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const chartData = Object.values(
    expenses.reduce((acc, item) => {
      const categoryName = item.category || "Other";

      if (!acc[categoryName]) {
        acc[categoryName] = {
          category: categoryName,
          total: 0,
        };
      }

      acc[categoryName].total += Number(item.amount);
      return acc;
    }, {})
  );

  if (!session) {
    return (
      <div className="container">
        <h1>Cloud Budget Dashboard</h1>

        <div className="card">
          <h2>Login / Sign Up</h2>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={signIn}>Login</button>
          <button onClick={signUp}>Create Account</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Cloud Budget Dashboard</h1>

      <div className="card">
        <p>Logged in as: {session.user.email}</p>
        <button onClick={signOut}>Logout</button>
      </div>

      <div className="card">
        <h2>Total Spent</h2>
        <p className="total">€{total.toFixed(2)}</p>
      </div>

      <form onSubmit={addExpense} className="card">
        <h2>Add Expense</h2>

        <input
          type="text"
          placeholder="Expense name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="number"
          placeholder="Amount (€)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>Fuel</option>
          <option>Food</option>
          <option>Insurance</option>
          <option>Subscriptions</option>
          <option>Other</option>
        </select>

        <button type="submit">Add Expense</button>
      </form>

      <div className="card">
        <h2>Spending by Category</h2>

        {chartData.length === 0 ? (
          <p>No chart data yet</p>
        ) : (
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Expenses</h2>

        {expenses.length === 0 ? (
          <p>No expenses yet</p>
        ) : (
          <ul>
            {expenses.map((expense) => (
              <li key={expense.id} className="expense-item">
                <span>
                  [{expense.category || "Other"}] {expense.name} - €
                  {Number(expense.amount).toFixed(2)}
                </span>

                <button
                  className="delete-btn"
                  onClick={() => deleteExpense(expense.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;