import type { Component } from 'solid-js';

import logo from './logo.svg';
import styles from './App.module.css';
import SolidTest from './SolidTest';
import ImageGen from './ImageGen';

const App: Component = () => {
  return (
    <div class={styles.App}>
      <SolidTest />
      <ImageGen />
    </div>
  );
};

export default App;
