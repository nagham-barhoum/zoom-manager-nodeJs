const logger = require('../src/utils/logger');

class JestLoggerReporter {
  onRunStart(results) {
    logger.info('Jest run started', {
      totalTests: results.numTotalTests,
      totalSuites: results.numTotalTestSuites,
    });
  }

  onTestResult(test, testResult) {
    const status = testResult.numFailingTests > 0 ? 'failed' : 'passed';
    logger.info('Jest test file completed', {
      file: testResult.testFilePath,
      status,
      durationMs: testResult.perfStats.end - testResult.perfStats.start,
      tests: testResult.numPassingTests + testResult.numFailingTests,
      passed: testResult.numPassingTests,
      failed: testResult.numFailingTests,
    });

    if (testResult.numFailingTests > 0) {
      const failures = testResult.testResults
        .filter(t => t.status === 'failed')
        .map(t => ({
          name: t.fullName,
          failureMessages: t.failureMessages.slice(0, 1),
        }));
      logger.error('Jest test failures', { file: testResult.testFilePath, failures });
    }
  }

  onRunComplete(_, results) {
    logger.info('Jest run completed', {
      success: results.success,
      totalTests: results.numTotalTests,
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      skipped: results.numPendingTests,
      totalSuites: results.numTotalTestSuites,
    });
  }
}

module.exports = JestLoggerReporter;
