import React, { useState } from "react";
import "./layout.css";
import ShapeImg from "./shape.png";
import Axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const PROGRAM_LINKS = {
  "NS-PLC": "https://ofac.treasury.gov/media/10411/download?inline",
  "UKRAINE-EO13662": "https://ofac.treasury.gov/sanctions-programs-and-country-information/ukraine-russia-related-sanctions",
  "RUSSIA-EO14024": "https://ofac.treasury.gov/faqs/topic/6626",
  "FSE-IR": "https://ofac.treasury.gov/recent-actions/fse_list_intro",
  "CAATSA - RUSSIA": "https://ofac.treasury.gov/sanctions-programs-and-country-information/countering-americas-adversaries-through-sanctions-act-related-sanctions",
  "VENEZUELA-EO13850": "https://ofac.treasury.gov/faqs/topic/1581",
  "CMIC-EO13959": "https://ofac.treasury.gov/faqs/topic/5671",
  "BURMA-EO14014": "https://home.treasury.gov/news/press-releases/jy1701",
  "ILLICIT-DRUGS-EO14059": "https://ofac.treasury.gov/recent-actions/20221219",
};

function App() {
  const [fullName, setFullName] = useState("");
  const [threshold, setThreshold] = useState(80);
  const [results, setResults] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [benchmarkVisible, setBenchmarkVisible] = useState(true);
  const [useML, setUseML] = useState(true);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setLoading(true);
    setSearchError(null);
    setBenchmarkResult(null);
    setBenchmarkVisible(true);

    try {
      const response = await Axios.get(
        `${process.env.REACT_APP_API_URL}/search`,
        {
          params: {
            name: fullName,
            threshold: threshold / 100,
            ml: useML,
          },
        }
      );
      setResults(response.data);
    } catch (error) {
      console.error("Search failed", error);
      setSearchError("Search failed. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBenchmark = async () => {
    if (!fullName.trim() || !results || results.length === 0) {
      setBenchmarkResult({ error: "Please perform a search first." });
      return;
    }

    const topMatch = results[0];

    try {
      const response = await Axios.get(`${process.env.REACT_APP_API_URL}/benchmark`, {
        params: {
          name1: fullName,
          name2: topMatch.name,
        },
      });

      const data = response.data;
      console.log("Benchmark API response:", data);

      if (data.success) {
        setBenchmarkResult(data.data);
        setBenchmarkVisible(false);
      } else {
        setBenchmarkResult({ error: data.error || "Unknown error" });
      }
    } catch (error) {
      console.error("Benchmark failed", error);
      setBenchmarkResult({ error: "Benchmark failed. Check the console." });
    }
  };

  const chartData =
    benchmarkResult && !benchmarkResult.error
      ? Object.entries(benchmarkResult).map(([key, value]) => ({
          metric: key,
          score: value * 100,
        }))
      : [];

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">International Sanctions List Search Engine</h1>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search for a person or organization..."
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
          />
          <label className="threshold-label">
            Minimum Score: <strong>{threshold}%</strong>
          </label>
          <input
            type="range"
            min="50"
            max="100"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value))}
            className="slider small-slider"
            style={{ width: "100%" }}
          />
          <label className="ml-toggle">
            <input
              type="checkbox"
              checked={useML}
              onChange={(e) => setUseML(e.target.checked)}
            />
            Use ML Scoring
          </label>
          <button type="submit" className="search-button" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
          <button
            type="button"
            className="reset-button"
            onClick={() => {
              setFullName("");
              setThreshold(80);
              setResults(null);
              setSearchError(null);
              setBenchmarkResult(null);
              setBenchmarkVisible(true);
            }}
          >
            Reset
          </button>
          {benchmarkVisible && (
            <button
              type="button"
              className="benchmark-button"
              onClick={handleBenchmark}
            >
              Run Benchmark
            </button>
          )}
          <p className="info-text">
            Note: The search is case-insensitive and will match partial names.
          </p>
        </form>

        {benchmarkResult && !benchmarkResult.error && (
          <div className="benchmark-result">
            <h3>Benchmark Result ({fullName} vs {results[0]?.name}):</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="score" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {benchmarkResult?.error && (
          <div className="benchmark-result error">{benchmarkResult.error}</div>
        )}

        {searchError && (
          <div className="benchmark-result error">{searchError}</div>
        )}

        {results !== null && (
          <ul className="results">
            {results.length > 0 ? (
              results.map((match) => (
                <li key={match.name} className="result-item">
                  <strong>{match.name}</strong>
                  {match.is_organization && (
                    <span className="tag">Organization</span>
                  )}
                  <span className="score-tag">
                    {match.score.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}%
                  </span>
                  <div className="details">
                    Country: {match.country || "N/A"} | Date of Birth: {match.date_of_birth || "N/A"} | Link: {PROGRAM_LINKS[match.program] ? (
                      <a
                        href={PROGRAM_LINKS[match.program]}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {match.program}
                      </a>
                    ) : (
                      match.program || "N/A"
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li className="no-match">No matches found.</li>
            )}
          </ul>
        )}
        <footer className="footer">
        <p>This project was developed as part of an internship at the Central Bank of Armenia</p>
        <p>© Ashot Tadevosyan, 2025</p>
      </footer>
      </div>
      <aside>
        <img src={ShapeImg} alt="Shape" />
      </aside>
    </div>
  );
}

export default App;