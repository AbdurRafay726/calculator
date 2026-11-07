import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function MobileCalculator () {
  const [tokens, setTokens] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const displayContainerRef = useRef(null);
  const isInputAction = useRef(false);

  const getRawExpression = () => {
    return [...tokens, currentInput].join('');
  };

  const rawExpr = getRawExpression();

  useEffect(() => {
    if (isInputAction.current && displayContainerRef.current) {
      const container = displayContainerRef.current;
      if (cursorPos === rawExpr.length) {
        container.scrollTop = container.scrollHeight;
      }
      isInputAction.current = false;
    }
  }, [rawExpr, cursorPos]);

  const calculateTotal = (expr) => {
    if (!expr) return 0;

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

  const parseRawToTokens = (str) => {
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

  const insertAtCursor = useCallback((char) => {
    isInputAction.current = true;
    const currentExpr = [...tokens, currentInput].join('');
    const newExpr = currentExpr.slice(0, cursorPos) + char + currentExpr.slice(cursorPos);
    parseRawToTokens(newExpr);
    setCursorPos((prev) => prev + char.length);
  }, [tokens, currentInput, cursorPos]);

  const handleNumber = useCallback((val) => {
    if (val === '.' && currentInput.includes('.')) return;
    insertAtCursor(val);
  }, [currentInput, insertAtCursor]);

  const handleOperator = useCallback((op) => {
    const currentExpr = [...tokens, currentInput].join('');
    if (!currentExpr && op !== '-') return;
    isInputAction.current = true;
    const lastChar = currentExpr[cursorPos - 1];
    if (['+', '-', '*', '/'].includes(lastChar)) {
      const newExpr = currentExpr.slice(0, cursorPos - 1) + op + currentExpr.slice(cursorPos);
      parseRawToTokens(newExpr);
    } else {
      insertAtCursor(op);
    }
  }, [tokens, currentInput, cursorPos, insertAtCursor]);

  const handleBackspace = useCallback(() => {
    const currentExpr = [...tokens, currentInput].join('');
    if (cursorPos === 0 || !currentExpr) return;
    isInputAction.current = true;
    const newExpr = currentExpr.slice(0, cursorPos - 1) + currentExpr.slice(cursorPos);
    parseRawToTokens(newExpr);
    setCursorPos((prev) => Math.max(0, prev - 1));
  }, [tokens, currentInput, cursorPos]);

  const handleEquals = useCallback(() => {
    const currentExpr = [...tokens, currentInput].join('');
    if (!currentExpr) return;
    isInputAction.current = true;
    const finalResult = calculateTotal(currentExpr);

    setHistory((prev) => [
      { expression: currentExpr, result: finalResult },
      ...prev.slice(0, 24),
    ]);

    setTokens([]);
    setCurrentInput(finalResult.toString());
    setCursorPos(finalResult.toString().length);
  }, [tokens, currentInput]);

  const handleClear = useCallback(() => {
    isInputAction.current = true;
    setTokens([]);
    setCurrentInput('');
    setCursorPos(0);
  }, []);

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showHistory) return;

      if (e.key >= '0' && e.key <= '9') {
        handleNumber(e.key);
      } else if (e.key === '.') {
        handleNumber('.');
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        handleOperator(e.key);
      } else if (e.key === 'x' || e.key === 'X') {
        handleOperator('*');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        handleClear();
      } else if (e.key === 'ArrowLeft') {
        isInputAction.current = false;
        setCursorPos((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        isInputAction.current = false;
        setCursorPos((p) => Math.min(rawExpr.length, p + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumber, handleOperator, handleEquals, handleBackspace, handleClear, rawExpr.length, showHistory]);

  const loadFromHistory = (item) => {
    isInputAction.current = true;
    parseRawToTokens(item.expression);
    setCursorPos(item.expression.length);
    setShowHistory(false);
  };

  const renderTextWithCursor = (text, startIdx) => {
    const localCursorOffset = cursorPos - startIdx;
    if (localCursorOffset >= 0 && localCursorOffset <= text.length) {
      return (
        <>
          {text.slice(0, localCursorOffset)}
          <span style={styles.inlineCursor}>|</span>
          {text.slice(localCursorOffset)}
        </>
      );
    }
    return text;
  };

  const renderTokenDisplay = () => {
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

      const renderCursorAtBoundary = (pos) => {
        if (cursorPos === pos) {
          return <span key={`cursor-${pos}`} style={styles.cursor}>|</span>;
        }
        return null;
      };

      if (isOp) {
        elements.push(renderCursorAtBoundary(tokenStartIdx));
        elements.push(
          <span
            key={`op-${i}`}
            style={styles.operatorToken}
            onClick={() => { isInputAction.current = false; setCursorPos(tokenEndIdx); }}
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

        elements.push(renderCursorAtBoundary(tokenStartIdx));
        elements.push(
          <div
            key={`group-${i}`}
            style={styles.sleekBadge}
            onClick={() => {
              isInputAction.current = false;
              setCursorPos(groupEndIdx);
            }}
          >
            <span style={styles.topExpression}>
              ({renderTextWithCursor(prevNum, tokenStartIdx)} {op === '*' ? '×' : '÷'} {nextNum !== undefined ? renderTextWithCursor(nextNum, tokenStartIdx + prevNum.length + op.length) : ''})
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

        elements.push(renderCursorAtBoundary(tokenStartIdx));
        elements.push(
          <div
            key={`term-${i}`}
            style={styles.sleekBadge}
            onClick={() => {
              isInputAction.current = false;
              setCursorPos(tokenEndIdx);
            }}
          >
            <span style={styles.topExpression}>
              ({renderTextWithCursor(token, tokenStartIdx)} × 1)
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
        {/* Header Bar */}
        <div style={styles.headerBar}>
          <span style={styles.appTitle}>StepCalc</span>
          <button style={styles.historyToggleBtn} onClick={() => setShowHistory(!showHistory)}>
            🕒 History ({history.length})
          </button>
        </div>

        {/* History Overlay */}
        {showHistory && (
          <div style={styles.historyDrawer}>
            <div style={styles.historyHeader}>
              <span style={styles.historyTitle}>Calculation History</span>
              <button style={styles.closeHistoryBtn} onClick={() => setShowHistory(false)}>✕</button>
            </div>
            <div style={styles.historyList}>
              {history.length === 0 ? (
                <div style={styles.emptyHistory}>No calculation history yet</div>
              ) : (
                history.map((item, idx) => (
                  <div key={idx} style={styles.historyCard} onClick={() => loadFromHistory(item)}>
                    <div style={styles.histExpr}>{item.expression}</div>
                    <div style={styles.histRes}>= {item.result}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Expression Display */}
        <div style={styles.expressionDisplay} ref={displayContainerRef}>
          <div style={styles.scrollContainer}>
            {renderTokenDisplay()}
          </div>
        </div>

        {/* Cursor Controls */}
        <div style={styles.cursorControls}>
          <button
            style={styles.navBtn}
            onClick={() => { isInputAction.current = false; setCursorPos((p) => Math.max(0, p - 1)); }}
          >
            ‹ Left
          </button>
          <span style={styles.cursorLabel}>Cursor: {cursorPos}</span>
          <button
            style={styles.navBtn}
            onClick={() => { isInputAction.current = false; setCursorPos((p) => Math.min(rawExpr.length, p + 1)); }}
          >
            Right ›
          </button>
        </div>

        {/* Total Display */}
        <div style={styles.totalDisplay}>
          <span style={styles.totalLabel}>Total</span>
          <span style={styles.totalValue}>{currentTotal}</span>
        </div>

        {/* Keypad */}
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
    width: '100vw',
    height: '100dvh',
    overflow: 'hidden',
    backgroundColor: '#090A0F',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '10px',
    boxSizing: 'border-box',
  },
  mobileFrame: {
    width: '100%',
    maxWidth: '380px',
    height: '100%',
    maxHeight: '700px',
    backgroundColor: '#12131C',
    borderRadius: '36px',
    padding: '20px 18px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '12px',
    boxSizing: 'border-box',
    border: '1px solid #1E202E',
    position: 'relative',
    overflow: 'hidden',
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px',
  },
  appTitle: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#89B4FA',
    letterSpacing: '0.5px',
  },
  historyToggleBtn: {
    backgroundColor: '#1E2030',
    color: '#CDD6F4',
    border: '1px solid #313244',
    borderRadius: '12px',
    padding: '5px 10px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  historyDrawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#12131CF2',
    backdropFilter: 'blur(10px)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    boxSizing: 'border-box',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  historyTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#F9E2AF',
  },
  closeHistoryBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#FFFFFF',
    fontSize: '20px',
    cursor: 'pointer',
  },
  historyList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingRight: '4px',
  },
  emptyHistory: {
    textAlign: 'center',
    color: '#6C7086',
    marginTop: '50px',
    fontSize: '13px',
  },
  historyCard: {
    backgroundColor: '#181926',
    padding: '12px 14px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    cursor: 'pointer',
    border: '1px solid #313244',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  },
  histExpr: {
    fontSize: '13px',
    color: '#CDD6F4',
    wordBreak: 'break-all',
    lineHeight: '1.4',
  },
  histRes: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#A6E3A1',
    textAlign: 'right',
    wordBreak: 'break-all',
  },
  expressionDisplay: {
    height: '105px',
    backgroundColor: '#0B0C14',
    borderRadius: '16px',
    padding: '12px 14px',
    overflowY: 'scroll',
    WebkitOverflowScrolling: 'touch',
    border: '1px solid #1A1B29',
    position: 'relative',
  },
  scrollContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '6px',
  },
  cursor: {
    color: '#F38BA8',
    fontWeight: '900',
    fontSize: '22px',
    animation: 'blink 1s infinite',
    margin: '0 2px',
    textShadow: '0 0 6px #F38BA8',
  },
  inlineCursor: {
    color: '#F38BA8',
    fontWeight: '900',
    fontSize: '14px',
    animation: 'blink 1s infinite',
    padding: '0 1px',
    verticalAlign: 'middle',
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
    maxWidth: '100%',
    wordBreak: 'break-all',
    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
  },
  topExpression: {
    fontSize: '11px',
    color: '#A6ADC8',
    fontWeight: '500',
    lineHeight: '1.2',
    maxWidth: '100%',
    wordBreak: 'break-all',
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
    borderRadius: '10px',
    padding: '4px 10px',
  },
  navBtn: {
    backgroundColor: '#313244',
    color: '#CDD6F4',
    border: 'none',
    borderRadius: '6px',
    padding: '3px 10px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
  cursorLabel: {
    fontSize: '11px',
    color: '#6C7086',
  },
  totalDisplay: {
    textAlign: 'right',
    padding: '0 4px',
  },
  totalLabel: {
    fontSize: '10px',
    color: '#89B4FA',
    display: 'block',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#A6E3A1',
    wordBreak: 'break-all',
  },
  keypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    justifyItems: 'center',
  },
  btn: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#232536',
    color: '#FFFFFF',
    fontSize: '24px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
  },
  btnOp: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#3B4261',
    color: '#FFFFFF',
    fontSize: '26px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
  },
  clearBtn: {
    width: '100%',
    backgroundColor: '#E78284',
    color: '#FFFFFF',
    fontSize: '22px',
  },
  backBtn: {
    backgroundColor: '#E5C890',
    color: '#FFFFFF',
    fontSize: '22px',
  },
  equalsBtn: {
    backgroundColor: '#A6E3A1',
    color: '#11111B',
    fontSize: '26px',
  },
};