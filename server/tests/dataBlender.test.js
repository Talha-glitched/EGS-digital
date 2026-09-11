import assert from 'assert';
import { detectVendor } from '../src/services/ingestionService.js';

async function runTests() {
  console.log('🚀 Starting Data Blender Unit Tests...');

  // Test 1: Vendor Header Auto-Detection
  console.log('\n--- Test 1: Vendor Header Auto-detection ---');
  
  const apolloHeaders = ['First Name', 'Last Name', 'Email', 'Company', 'Person Linkedin Url', 'Title'];
  const hunterHeaders = ['First Name', 'Email', 'Hunter Score', 'Company Name'];
  const lushaHeaders = ['Name', 'Work Email 2', 'Lusha Phone 1', 'Company'];
  const manualHeaders = ['Contact Name', 'Email Address', 'Company Name', 'Website'];

  assert.strictEqual(detectVendor(apolloHeaders), 'Apollo', 'Should detect Apollo headers');
  assert.strictEqual(detectVendor(hunterHeaders), 'Hunter', 'Should detect Hunter headers');
  assert.strictEqual(detectVendor(lushaHeaders), 'Lusha', 'Should detect Lusha headers');
  assert.strictEqual(detectVendor(manualHeaders), 'Manual', 'Should fallback to Manual for unknown headers');
  
  console.log('✅ Vendor Header Auto-detection passed.');
  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
