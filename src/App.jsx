import React, { useState, useEffect, useRef } from 'react';

export default function MobileCalculator () {
  const [tokens, setTokens] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const displayEndRef = useRef(null);

  // Auto-scroll to the bottom whenever expression updates
  useEffect(() => {
    displayEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tokens, currentInput]);

  // Order of operations calculation
  const calculateTotal = (allTokens) => {
    if (allTokens.length === 0) return 0;

    const intermediate = [];
    let i = 0;
    while (i < allTokens.length) {
      const token = allTokens[i];
      if (token === '*' || token === '/') {
        const prevNum = parseFloat(intermediate.pop());
        const nextNum = parseFloat(allTokens[i + 1]);

        if (isNaN(nextNum)) {
          intermediate.push(prevNum);
        } else {
          const res = token === '*' ? prevNum * nextNum : prevNum / nextNum;
          intermediate.push(res.toString());
          i++;
        }
      } else {
        intermediate.push(token);
      }
      i++;
    }

    let result = parseFloat(intermediate[0]) || 0;
    for (let j = 1; j < intermediate.length; j += 2) {
      const op = intermediate[j];
      const val = parseFloat(intermediate[j + 1]);
      if (isNaN(val)) break;
      if (op === '+') result += val;
      if (op === '-') result -= val;
    }

    return Math.round(result * 1e8) / 1e8;
  };

  const getFullTokens = () => {
    return currentInput !== '' ? [...tokens, currentInput] : tokens;
  };

  const fullTokens = getFullTokens();
  const currentTotal = fullTokens.length > 0 ? calculateTotal(fullTokens) : 0;

  const handleNumber = (val) => {
    if (val === '.' && currentInput.includes('.')) return;
    setCurrentInput((prev) => prev + val);
  };

  const handleOperator = (op) => {
    if (!currentInput && tokens.length === 0) return;

    if (currentInput !== '') {
      setTokens([...tokens, currentInput, op]);
      setCurrentInput('');
    } else {
      setTokens([...tokens.slice(0, -1), op]);
    }
  };

  const handleBackspace = () => {
    if (currentInput.length > 0) {
      setCurrentInput((prev) => prev.slice(0, -1));
    } else if (tokens.length > 0) {
      const newTokens = tokens.slice(0, -1);
      const lastToken = newTokens[newTokens.length - 1];

      if (lastToken && !['+', '-', '*', '/'].includes(lastToken)) {
        setCurrentInput(lastToken);
        setTokens(newTokens.slice(0, -1));
      } else {
        setTokens(newTokens);
      }
    }
  };

  const handleEquals = () => {
    if (fullTokens.length === 0) return;
    const finalResult = calculateTotal(fullTokens);
    setTokens([]);
    setCurrentInput(finalResult.toString());
  };

  const handleClear = () => {
    setTokens([]);
    setCurrentInput('');
  };

  // Render tokens into vertical rows (2 visible at a time)
  const renderTokenDisplay = () => {
    const elements = [];
    let i = 0;

    while (i < fullTokens.length) {
      const token = fullTokens[i];
      const isOp = ['+', '-', '*', '/'].includes(token);

      if (isOp) {
        elements.push(
          <span key={`op-${i}`} style={styles.operatorToken}>
            {token === '*' ? '×' : token === '/' ? '÷' : token}
          </span>
        );
        i++;
        continue;
      }

      const prevOp = fullTokens[i - 1];
      const nextOp = fullTokens[i + 1];

      if (nextOp === '*' || nextOp === '/') {
        // Multiplication/Division Group
        const prevNum = token;
        const op = nextOp;
        const nextNum = fullTokens[i + 2];

        let stepResult = null;
        if (nextNum !== undefined && !isNaN(parseFloat(prevNum)) && !isNaN(parseFloat(nextNum))) {
          const res = op === '*' ? parseFloat(prevNum) * parseFloat(nextNum) : parseFloat(prevNum) / parseFloat(nextNum);
          stepResult = Math.round(res * 1e4) / 1e4;
        }

        elements.push(
          <div key={`group-${i}`} style={styles.sleekBadge}>
            <span style={styles.topExpression}>
              ({prevNum} {op === '*' ? '×' : '÷'} {nextNum !== undefined ? nextNum : ''})
            </span>
            <span style={styles.bottomAnswer}>
              {stepResult !== null ? stepResult : '...'}
            </span>
          </div>
        );
        i += 3;
      } else if (prevOp === '*' || prevOp === '/') {
        i++;
      } else {
        // Addition/Subtraction term formatted as (N × 1)
        const val = parseFloat(token);
        const isValid = !isNaN(val);

        elements.push(
          <div key={`term-${i}`} style={styles.sleekBadge}>
            <span style={styles.topExpression}>
              ({token} × 1)
            </span>
            <span style={styles.bottomAnswer}>
              {isValid ? val : '...'}
            </span>
          </div>
        );
        i++;
      }
    }

    return elements;
  };

  return (
    <div style={styles.mobileFrame}>
      {/* Vertical Auto-Scrolling Expression Display (Shows 2 Rows) */}
      <div style={styles.expressionDisplay}>
        <div style={styles.scrollContainer}>
          {renderTokenDisplay()}
          <div ref={displayEndRef} />
        </div>
      </div>

      {/* Running Total Display */}
      <div style={styles.totalDisplay}>
        <span style={styles.totalLabel}>Total</span>
        <span style={styles.totalValue}>{currentTotal}</span>
      </div>

      {/* Keypad Grid with Round White-Text Buttons */}
      <div style={styles.keypad}>
        <button style={{ ...styles.btn, ...styles.clearBtn, gridColumn: 'span 3', borderRadius: '30px' }} onClick={handleClear}>C</button>
        <button style={{ ...styles.btn, ...styles.backBtn }} onClick={handleBackspace}>⌫</button>

        <button style={styles.btn} onClick={() => handleNumber('7')}>7</button>
        <button style={styles.btn} onClick={() => handleNumber('8')}>8</button>
        <button style={styles.btn} onClick={() => handleNumber('9')}>9</button>
        <button style={styles.btnOp} onClick={() => handleOperator('/')}>÷</button>

        <button style={styles.btn} onClick={() => handleNumber('4')}>4</button>
        <button style={styles.btn} onClick={() => handleNumber('5')}>5</button>
        <button style={styles.btn} onClick={() => handleNumber('6')}>6</button>
        <button style={styles.btnOp} onClick={() => handleOperator('*')}>×</button>

        <button style={styles.btn} onClick={() => handleNumber('1')}>1</button>
        <button style={styles.btn} onClick={() => handleNumber('2')}>2</button>
        <button style={styles.btn} onClick={() => handleNumber('3')}>3</button>
        <button style={styles.btnOp} onClick={() => handleOperator('-')}>-</button>

        <button style={styles.btn} onClick={() => handleNumber('0')}>0</button>
        <button style={styles.btn} onClick={() => handleNumber('.')}>.</button>
        <button style={{ ...styles.btn, ...styles.equalsBtn }} onClick={handleEquals}>=</button>
        <button style={styles.btnOp} onClick={() => handleOperator('+')}>+</button>
      </div>
    </div>
  );
}

const styles = {
  mobileFrame: {
    width: '100%',
    maxWidth: '360px',
    margin: '20px auto',
    backgroundColor: '#1E1E2E',
    borderRadius: '32px',
    padding: '24px 20px',
    boxShadow: '0 12px 35px rgba(0,0,0,0.45)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    boxSizing: 'border-box',
  },
  expressionDisplay: {
    height: '85px', // Fixed height to fit ~2 vertical rows nicely
    backgroundColor: '#181825',
    borderRadius: '16px',
    padding: '10px 14px',
    overflowY: 'auto',
    scrollbarWidth: 'none',
  },
  scrollContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
  },
  sleekBadge: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#2A2B3D',
    border: '1px solid #FAB387',
    borderRadius: '8px',
    padding: '3px 9px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  topExpression: {
    fontSize: '11px',
    color: '#A6ADC8',
    fontWeight: '500',
    lineHeight: '1.2',
  },
  bottomAnswer: {
    fontSize: '14px',
    color: '#FAB387',
    fontWeight: '700',
    lineHeight: '1.2',
  },
  operatorToken: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#F9E2AF',
    padding: '0 4px',
  },
  totalDisplay: {
    textAlign: 'right',
    padding: '0 5px',
  },
  totalLabel: {
    fontSize: '11px',
    color: '#A6ADC8',
    display: 'block',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#A6E3A1',
  },
  keypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    justifyItems: 'center',
  },
  btn: {
    width: '62px',
    height: '62px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#313244',
    color: '#FFFFFF', // Crisp White Text
    fontSize: '24px', // Increased size
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOp: {
    width: '62px',
    height: '62px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#89B4FA',
    color: '#FFFFFF', // Crisp White Text
    fontSize: '26px', // Increased size
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    width: '100%',
    backgroundColor: '#F38BA8',
    color: '#FFFFFF',
    fontSize: '22px',
  },
  backBtn: {
    backgroundColor: '#FAB387',
    color: '#FFFFFF',
    fontSize: '22px',
  },
  equalsBtn: {
    backgroundColor: '#A6E3A1',
    color: '#FFFFFF',
    fontSize: '26px',
  },
};