import MonoResampler from "../worklet/MonoResampler";

test("downsample 16 to 8", () => {
  let resampler = new MonoResampler(16, 8, 16);
  let inputs = [0.12, 0.16, 0.1, 0.08, 0.16, 0.2, 0.4, 0.6, 0.2, 0.1, 0.6, 0.2, 0.3, 0.6, 0.9, 0.12];
  let out = resampler.resample(inputs);
  expect(out.length).toBe(8);
  out.forEach((val, i) => {
    expect(val).toBeCloseTo((inputs[i * 2] + inputs[i * 2 + 1]) / 2);
  });
  // Run the test twice to ensure determinism
  out = resampler.resample(inputs);
  expect(out.length).toBe(8);
  out.forEach((val, i) => {
    expect(val).toBeCloseTo((inputs[i * 2] + inputs[i * 2 + 1]) / 2);
  });
});

test("downsample 11 to 7", () => {
  let resampler = new MonoResampler(11, 7, 22);
  let inputs = [0.12, 0.16, 0.1, 0.08, 0.16, 0.2, 0.4, 0.6, 0.2, 0.1, 0.6, 0.2, 0.3, 0.6, 0.9, 0.18];
  let out1 = resampler.resample(inputs);
  expect(out1.length).toBe(10);
  let out2 = resampler.resample(inputs);
  expect(out2.length).toBe(10);
  out1.forEach((val, i) => {
    expect(val).not.toBeCloseTo(out2[i]);
  });
  out2 = resampler.resample(inputs);
  expect(out2.length).toBe(10);
  out2 = resampler.resample(inputs);
  expect(out2.length).toBe(10);
  out2 = resampler.resample(inputs);
  expect(out2.length).toBe(10);
  out2 = resampler.resample(inputs);
  expect(out2.length).toBe(11);
  // Prime numbers are fun! Confirms pattern 10 10 10 11 10 10 10 10 11
  for (let i = 0; i < 10; i++) {
    out2 = resampler.resample(inputs);
    expect(out2.length).toBe(10);
    out2 = resampler.resample(inputs);
    expect(out2.length).toBe(10);
    out2 = resampler.resample(inputs);
    expect(out2.length).toBe(10);
    out2 = resampler.resample(inputs);
    expect(out2.length).toBe(10);
    out2 = resampler.resample(inputs);
    expect(out2.length).toBe(11);
    out2 = resampler.resample(inputs);
    expect(out2.length).toBe(10);
    out2 = resampler.resample(inputs);
    expect(out2.length).toBe(10);
    out2 = resampler.resample(inputs);
    expect(out2.length).toBe(10);
    out2 = resampler.resample(inputs);
    expect(out2.length).toBe(10);
    out2 = resampler.resample(inputs);
    expect(out2.length).toBe(10);
    out2 = resampler.resample(inputs);
    expect(out2.length).toBe(11);
  }
});

test("downsample 46000 to 44100", () => {
  let resampler = new MonoResampler(46000, 44100, 80);
  let inputs = [0.12, 0.16, 0.1, 0.08, 0.16, 0.2, 0.4, 0.6, 0.2, 0.1, 0.6, 0.2, 0.3, 0.6, 0.9, 0.18];
  // This test confirms the repeated pattern 15 15 16 which is the downsample ratio for 46000 -> 44100 with 16 samples (I'm guessing here)
  let out = resampler.resample(inputs);
  expect(out.length).toBe(15);
  out = resampler.resample(inputs);
  expect(out.length).toBe(15);
  out = resampler.resample(inputs);
  expect(out.length).toBe(16);
  out = resampler.resample(inputs);
  expect(out.length).toBe(15);
  out = resampler.resample(inputs);
  expect(out.length).toBe(15);
  out = resampler.resample(inputs);
  expect(out.length).toBe(16);
  out = resampler.resample(inputs);
  expect(out.length).toBe(15);
  out = resampler.resample(inputs);
  expect(out.length).toBe(15);
  out = resampler.resample(inputs);
  expect(out.length).toBe(16);
});

test("upsample 8 to 16", () => {
  let resampler = new MonoResampler(8, 16, 32);
  let inputs = [0.12, 0.16, 0.1, 0.08, 0.16, 0.2, 0.4, 0.6, 0.2, 0.1, 0.6, 0.2, 0.3, 0.6, 0.9, 0.18];
  let out = resampler.resample(inputs);
  // Length will be 31 for the first run because it will not know the 32nd value until we get another set
  expect(out.length).toBe(31);
  out.forEach((val, i) => {
    expect(val).toBeCloseTo((inputs[Math.floor(i / 2)] + inputs[Math.floor((i + 1) / 2)]) / 2);
  });
  // Length should be 32 from now on
  out = resampler.resample(inputs);
  expect(out.length).toBe(32);
  out.forEach((val, i) => {
    if (i === 0) {
      expect(val).toBeCloseTo((inputs[inputs.length - 1] + inputs[0]) / 2);
    } else {
      expect(val).toBeCloseTo((inputs[Math.floor((i - 1) / 2)] + inputs[Math.floor(i / 2)]) / 2);
    }
  });
  out = resampler.resample(inputs);
  expect(out.length).toBe(32);
  out = resampler.resample(inputs);
  expect(out.length).toBe(32);
  out = resampler.resample(inputs);
  expect(out.length).toBe(32);
});

test("upsample 44100 to 46000", () => {
  let resampler = new MonoResampler(44100, 46000, 80);
  let inputs = [0.12, 0.16, 0.1, 0.08, 0.16, 0.2, 0.4, 0.6, 0.2, 0.1, 0.6, 0.2, 0.3, 0.6, 0.9, 0.18];
  // This test confirms the repeated pattern 16 17 17 which is the upsample ratio for 44100 -> 46000 with 16 samples (I'm guessing here)
  let out = resampler.resample(inputs);
  expect(out.length).toBe(16);
  out = resampler.resample(inputs);
  expect(out.length).toBe(17);
  out = resampler.resample(inputs);
  expect(out.length).toBe(17);
  out = resampler.resample(inputs);
  expect(out.length).toBe(16);
  out = resampler.resample(inputs);
  expect(out.length).toBe(17);
  out = resampler.resample(inputs);
  expect(out.length).toBe(17);
  out = resampler.resample(inputs);
  expect(out.length).toBe(16);
  out = resampler.resample(inputs);
  expect(out.length).toBe(17);
  out = resampler.resample(inputs);
  expect(out.length).toBe(17);
});
