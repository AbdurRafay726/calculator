import React, { useState, useEffect, useRef } from 'react';

export default function MobileCalculator () {
  const [tokens, setTokens] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const displayEndRef = useRef(null);

  const getRawExpression = () => {
    return [...tokens, currentInput].join('');
  };

  const rawExpr = getRawExpression();

  useEffect(() => {
    displayEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rawExpr, cursorPos]);

  const calculateTotal = (expr) => {
    if (!expr) return 0;

    // Fixed regex: Removed unnecessary escapes inside character classes
    const matches = expr.match(/(\d+\.?\d*|[+\-*/])/g);
    if (!matches) return 0;

    const intermediate = [];
    let i = 0;
    while (i < matches.length) {
      const token = matches[i];
      if (token === '*' || token === '/') {
        const prevNum = parseFloat(intermediate.pop());
        const nextNum = parseFloat(matches[i + 1]);

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

  const currentTotal = calculateTotal(rawExpr);

  const insertAtCursor = (char) => {
    const newExpr = rawExpr.slice(0, cursorPos) + char + rawExpr.slice(cursorPos);
    parseRawToTokens(newExpr);
    setCursorPos((prev) => prev + char.length);
  };

  const parseRawToTokens = (str) => {
    // Fixed regex here as well
    const parts = str.match(/(\d+\.?\d*|[+\-*/])/g) || [];
    if (parts.length === 0) {
      setTokens([]);
      setCurrentInput('');
      return;
    }

    const last = parts[parts.length - 1];
    if (['+', '-', '*', '/'].includes(last)) {
      setTokens(parts);
      setCurrentInput('');
    } else {
      setTokens(parts.slice(0, -1));
      setCurrentInput(last);
    }
  };

  const handleNumber = (val) => {
    if (val === '.' && currentInput.includes('.')) return;
    insertAtCursor(val);
  };

  const handleOperator = (op) => {
    if (!rawExpr && op !== '-') return;
    const lastChar = rawExpr[cursorPos - 1];
    if (['+', '-', '*', '/'].includes(lastChar)) {
      const newExpr = rawExpr.slice(0, cursorPos - 1) + op + rawExpr.slice(cursorPos);
      parseRawToTokens(newExpr);
    } else {
      insertAtCursor(op);
    }
  };

  const handleBackspace = () => {
    if (cursorPos === 0 || !rawExpr) return;
    const newExpr = rawExpr.slice(0, cursorPos - 1) + rawExpr.slice(cursorPos);
    parseRawToTokens(newExpr);
    setCursorPos((prev) => Math.max(0, prev - 1));
  };

  const handleEquals = () => {
    if (!rawExpr) return;
    const finalResult = calculateTotal(rawExpr).toString();
    setTokens([]);
    setCurrentInput(finalResult);
    setCursorPos(finalResult.length);
  };

  const handleClear = () => {
    setTokens([]);
    setCurrentInput('');
    setCursorPos(0);
  };

  const renderTokenDisplay = () => {
    // Fixed regex here as well
    const matches = rawExpr.match(/(\d+\.?\d*|[+\-*/])/g) || [];
    const elements = [];
    let charCounter = 0;

    let i = 0;
    while (i < matches.length) {
      const token = matches[i];
      const tokenStartIdx = charCounter;
      charCounter += token.length;
      const tokenEndIdx = charCounter;

      const isOp = ['+', '-', '*', '/'].includes(token);

      const renderCursorIfNeeded = (pos) => {
        if (cursorPos === pos) {
          return <span key={`cursor-${pos}`} style={styles.cursor}>|</span>;
        }
        return null;
      };

      if (isOp) {
        elements.push(renderCursorIfNeeded(tokenStartIdx));
        elements.push(
          <span
            key={`op-${i}`}
            style={styles.operatorToken}
            onClick={() => setCursorPos(tokenEndIdx)}
          >
            {token === '*' ? '×' : token === '/' ? '÷' : token}
          </span>
        );
        i++;
        continue;
      }

      const nextOp = matches[i + 1];

      if (nextOp === '*' || nextOp === '/') {
        const prevNum = token;
        const op = nextOp;
        const nextNum = matches[i + 2];
        const groupLen = prevNum.length + op.length + (nextNum ? nextNum.length : 0);
        const groupEndIdx = tokenStartIdx + groupLen;

        let stepResult = null;
        if (nextNum !== undefined && !isNaN(parseFloat(prevNum)) && !isNaN(parseFloat(nextNum))) {
          const res = op === '*' ? parseFloat(prevNum) * parseFloat(nextNum) : parseFloat(prevNum) / parseFloat(nextNum);
          stepResult = Math.round(res * 1e4) / 1e4;
        }

        elements.push(renderCursorIfNeeded(tokenStartIdx));
        elements.push(
          <div
            key={`group-${i}`}
            style={styles.sleekBadge}
            onClick={() => setCursorPos(groupEndIdx)}
          >
            <span style={styles.topExpression}>
              ({prevNum} {op === '*' ? '×' : '÷'} {nextNum !== undefined ? nextNum : ''})
            </span>
            <span style={styles.bottomAnswer}>
              {stepResult !== null ? stepResult : '...'}
            </span>
          </div>
        );

        charCounter += nextOp.length + (nextNum ? nextNum.length : 0);
        i += 3;
      } else {
        const val = parseFloat(token);
        const isValid = !isNaN(val);

        elements.push(renderCursorIfNeeded(tokenStartIdx));
        elements.push(
          <div
            key={`term-${i}`}
            style={styles.sleekBadge}
            onClick={() => setCursorPos(tokenEndIdx)}
          >
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

    if (cursorPos === rawExpr.length) {
      elements.push(<span key="cursor-end" style={styles.cursor}>|</span>);
    }

    return elements;
  };

  return (
    <div style={styles.outerContainer}>
      <div style={styles.mobileFrame}>
        <div style={styles.expressionDisplay}>
          <div style={styles.scrollContainer}>
            {renderTokenDisplay()}
            <div ref={displayEndRef} />
          </div>
        </div>

        <div style={styles.cursorControls}>
          <button
            style={styles.navBtn}
            onClick={() => setCursorPos((p) => Math.max(0, p - 1))}
          >
            ‹ Left
          </button>
          <span style={styles.cursorLabel}>Cursor Position: {cursorPos}</span>
          <button
            style={styles.navBtn}
            onClick={() => setCursorPos((p) => Math.min(rawExpr.length, p + 1))}
          >
            Right ›
          </button>
        </div>

        <div style={styles.totalDisplay}>
          <span style={styles.totalLabel}>Total</span>
          <span style={styles.totalValue}>{currentTotal}</span>
        </div>

        <div style={styles.keypad}>
          <button style={{ ...styles.btn, ...styles.clearBtn, gridColumn: 'span 3', borderRadius: '34px' }} onClick={handleClear}>C</button>
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
    </div>
  );
}

const styles = {
  outerContainer: {
    minHeight: '100vh',
    backgroundColor: '#090A0F',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px 10px',
  },
  mobileFrame: {
    width: '100%',
    maxWidth: '380px',
    minHeight: '660px',
    backgroundColor: '#12131C',
    borderRadius: '36px',
    padding: '24px 20px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '15px',
    boxSizing: 'border-box',
    border: '1px solid #1E202E',
  },
  expressionDisplay: {
    height: '110px',
    backgroundColor: '#0B0C14',
    borderRadius: '18px',
    padding: '12px 14px',
    overflowY: 'auto',
    scrollbarWidth: 'none',
    border: '1px solid #1A1B29',
  },
  scrollContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '6px',
  },
  cursor: {
    color: '#A6E3A1',
    fontWeight: 'bold',
    fontSize: '20px',
    animation: 'blink 1s infinite',
    margin: '0 2px',
  },
  sleekBadge: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#1E2030',
    border: '1px solid #FAB387',
    borderRadius: '8px',
    padding: '4px 10px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
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
    cursor: 'pointer',
  },
  cursorControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#181926',
    borderRadius: '12px',
    padding: '4px 10px',
  },
  navBtn: {
    backgroundColor: '#313244',
    color: '#CDD6F4',
    border: 'none',
    borderRadius: '8px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cursorLabel: {
    fontSize: '11px',
    color: '#A6ADC8',
  },
  totalDisplay: {
    textAlign: 'right',
    padding: '0 5px',
  },
  totalLabel: {
    fontSize: '11px',
    color: '#89B4FA',
    display: 'block',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: '40px',
    fontWeight: 'bold',
    color: '#A6E3A1',
  },
  keypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '14px',
    justifyItems: 'center',
  },
  btn: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#232536',
    color: '#FFFFFF',
    fontSize: '26px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOp: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#3B4261',
    color: '#FFFFFF',
    fontSize: '28px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    width: '100%',
    backgroundColor: '#E78284',
    color: '#FFFFFF',
    fontSize: '24px',
  },
  backBtn: {
    backgroundColor: '#E5C890',
    color: '#FFFFFF',
    fontSize: '24px',
  },
  equalsBtn: {
    backgroundColor: '#A6E3A1',
    color: '#11111B',
    fontSize: '28px',
  },
};