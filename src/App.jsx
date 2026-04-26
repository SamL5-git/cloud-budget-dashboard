import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Fuel");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [monthlyBudget, setMonthlyBudget] = useState(0);

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
      fetchMonthlyBudget();
    }
  }, [session, selectedMonth]);

  useEffect(() => {
    setExpenseDate(`${selectedMonth}-01`);
  }, [selectedMonth]);

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) alert(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setExpenses([]);
    setMonthlyBudget(0);
  }

  async function fetchExpenses() {
    setLoading(true);

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    if (error) {
      console.log("Error fetching expenses:", error);
    } else {
      setExpenses(data);
    }

    setLoading(false);
  }

  async function fetchMonthlyBudget() {
    if (!session) return;

    const { data, error } = await supabase
      .from("monthly_budgets")
      .select("budget")
      .eq("user_id", session.user.id)
      .eq("month", selectedMonth)
      .single();

    if (error) {
      setMonthlyBudget(0);
    } else {
      setMonthlyBudget(Number(data.budget));
    }
  }

  async function saveMonthlyBudget(value) {
    if (!session) return;

    setMonthlyBudget(value);

    const { error } = await supabase.from("monthly_budgets").upsert(
      {
        user_id: session.user.id,
        month: selectedMonth,
        budget: value,
      },
      {
        onConflict: "user_id,month",
      }
    );

    if (error) {
      console.log("Error saving budget:", error);
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
        expense_date: expenseDate,
        user_id: session.user.id,
      },
    ]);

    if (error) {
      console.log("Error adding expense:", error);
    } else {
      setName("");
      setAmount("");
      fetchExpenses();
    }
  }

  async function deleteExpense(id) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      console.log("Error deleting expense:", error);
    } else {
      fetchExpenses();
    }
  }
  function exportToCSV() {
  if (monthlyExpenses.length === 0) {
    alert("No data to export");
    return;
  }

  const headers = ["Name", "Amount (€)", "Category", "Date"];

  const rows = monthlyExpenses.map((e) => [
    e.name,
    e.amount,
    e.category,
    e.expense_date || e.created_at,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `expenses-${selectedMonth}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

  const monthlyExpenses = expenses.filter((expense) => {
    const dateToUse = expense.expense_date || expense.created_at;
    const expenseMonth = new Date(dateToUse).toISOString().slice(0, 7);
    return expenseMonth === selectedMonth;
  });

  const total = monthlyExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const remaining = monthlyBudget - total;

  const percent =
    monthlyBudget > 0 ? Math.min((total / monthlyBudget) * 100, 100) : 0;

  const averageExpense =
    monthlyExpenses.length > 0 ? total / monthlyExpenses.length : 0;

  const biggestExpense = monthlyExpenses.reduce(
    (max, expense) =>
      Number(expense.amount) > Number(max.amount) ? expense : max,
    { amount: 0, name: "None" }
  );

  const isOverBudget = monthlyBudget > 0 && total > monthlyBudget;

  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const isCurrentMonth =
    today.toISOString().slice(0, 7) === selectedMonth;

  const daysPassed = isCurrentMonth ? today.getDate() : daysInMonth;

  const projectedSpend =
    daysPassed > 0 ? (total / daysPassed) * daysInMonth : 0;

  const chartData = Object.values(
    monthlyExpenses.reduce((acc, item) => {
      const cat = item.category || "Other";

      if (!acc[cat]) {
        acc[cat] = { category: cat, total: 0 };
      }

      acc[cat].total += Number(item.amount);
      return acc;
    }, {})
  );

  const topCategory = chartData.length
    ? chartData.reduce((max, item) =>
        item.total > max.total ? item : max
      )
    : null;

  const monthlyTrendData = Object.values(
    expenses.reduce((acc, expense) => {
      const dateToUse = expense.expense_date || expense.created_at;
      const month = new Date(dateToUse).toISOString().slice(0, 7);

      if (!acc[month]) {
        acc[month] = {
          month,
          total: 0,
        };
      }

      acc[month].total += Number(expense.amount);
      return acc;
    }, {})
  ).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="container">
      <h1>Cloud Budget Dashboard</h1>
      <p className="subtitle">Track your spending smarter</p>

      {!session ? (
        <div className="card auth-card">
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

          <div className="auth-actions">
            <button onClick={signIn}>Login</button>
            <button onClick={signUp}>Create Account</button>
          </div>

          <button onClick={signInWithGoogle}>Continue with Google</button>
        </div>
      ) : (
        <>
          <div className="card">
            <span className="user-pill">{session.user.email}</span>

            <button onClick={signOut} className="logout-btn">
              Logout
            </button>
          </div>

          <div className="dashboard-grid">
            <div className="card full monthly-controls">
              <div>
                <label>Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>

              <div>
                <label>Budget (€)</label>
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) =>
                    saveMonthlyBudget(Number(e.target.value))
                  }
                />
              </div>
            </div>

            <div className="card">
              <h2>Total Spent</h2>
              <p className="total">€{total.toFixed(2)}</p>
            </div>

            <div className="card">
              <h2>Remaining</h2>
              <p className="total">€{remaining.toFixed(2)}</p>
            </div>

            <div className="card">
              <h2>Average Expense</h2>
              <p className="total">€{averageExpense.toFixed(2)}</p>
            </div>

            <div className="card">
              <h2>Biggest Expense</h2>
              <p className="total">{biggestExpense.name}</p>
              <p>€{Number(biggestExpense.amount).toFixed(2)}</p>
            </div>

            <div className="card">
              <h2>Top Category</h2>

              {topCategory ? (
                <>
                  <p className="total">{topCategory.category}</p>
                  <p>€{topCategory.total.toFixed(2)}</p>
                </>
              ) : (
                <p>No data yet</p>
              )}
            </div>

            <div className="card">
              <h2>Projected Spend</h2>
              <p className="total">€{projectedSpend.toFixed(2)}</p>
              <p>Estimated month-end spend</p>
            </div>

            <div className="card full">
              <h2>Budget Used</h2>

              {isOverBudget && (
                <p style={{ color: "#ef4444", fontWeight: "bold" }}>
                  ⚠️ You are over budget this month
                </p>
              )}

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${percent}%` }}
                ></div>
              </div>

              <p>{percent.toFixed(0)}%</p>
            </div>

            <form onSubmit={addExpense} className="card">
              <h2>Add Expense</h2>

              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                type="number"
                placeholder="Amount"
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

              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />

              <button type="submit">Add Expense</button>
            </form>

            <div className="card full">
              <h2>Monthly Spending Trend</h2>

              {monthlyTrendData.length === 0 ? (
                <p>No trend data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyTrendData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="total"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card full">
              <h2>Spending by Category</h2>

              {loading ? (
                <p>Loading...</p>
              ) : chartData.length === 0 ? (
                <p>No chart data for this month yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card full">
  <div className="section-header">
    <h2>Expenses</h2>

    <button onClick={exportToCSV} className="export-btn">
      Export CSV
    </button>
  </div>

              {loading ? (
                <p>Loading...</p>
              ) : monthlyExpenses.length === 0 ? (
                <p>No expenses for this month yet.</p>
              ) : (
                <ul className="expense-list">
                  {monthlyExpenses.map((expense) => (
                    <li key={expense.id} className="expense-item">
                      <div>
                        <div className="expense-name">{expense.name}</div>
                        <div className="expense-category">
                          {expense.category || "Other"}
                        </div>
                      </div>

                      <div className="expense-amount">
                        €{Number(expense.amount).toFixed(2)}
                      </div>

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
        </>
      )}
    </div>
  );
}

export default App;
