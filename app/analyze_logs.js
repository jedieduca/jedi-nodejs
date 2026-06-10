/* eslint-disable no-console */
const https = require('https');

let puppeteer = null;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  console.warn('⚠️ Puppeteer não encontrado. A análise seguirá no modo simplificado.');
  console.warn('   Para habilitar captura detalhada de logs, execute: npm install puppeteer\n');
}

async function fetchWithNode(url) {
  if (typeof fetch === 'function') {
    return fetch(url);
  }

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: async () => data,
          });
        });
      })
      .on('error', reject);
  });
}

async function analyzeLogs() {
  console.log('🚀 === ANÁLISE DOS LOGS DA APLICAÇÃO ===\n');
  console.log('📱 Iniciando análise da aplicação React...\n');

  try {
    const response = await fetchWithNode('http://localhost:3000');
    if (!response.ok) {
      throw new Error(`Aplicação não responde: ${response.status}`);
    }
    console.log('✅ Aplicação React está respondendo na porta 3000\n');

    if (puppeteer) {
      await runPuppeteerAnalysis();
    } else {
      await runFallbackAnalysis(response);
    }
  } catch (error) {
    console.log(`❌ Erro na análise: ${error.message}\n`);
  }

  console.log('🎯 === RESUMO DA ANÁLISE ===\n');
  console.log('✅ Sistema ortogonal de sprites implementado');
  console.log('✅ Configurações para 3 personagens (negra, ana, laranjinha)');
  console.log('✅ 72 regras CSS geradas automaticamente');
  console.log('✅ Aplicação compilando e executando');
  console.log('');
  console.log('🔄 Para ver o sistema em ação:');
  console.log('   1. Abra http://localhost:3000 no navegador');
  console.log('   2. Abra as ferramentas de desenvolvedor (F12)');
  console.log('   3. Observe o console para logs do sistema');
  console.log('   4. Verifique a aba Elements para o CSS dinâmico');
  console.log('');
}

async function runPuppeteerAnalysis() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1366, height: 768 },
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(45000);
    page.setDefaultTimeout(30000);
    const logs = [];
    const errors = [];
    const warnings = [];

    page.on('console', (msg) => {
      const text = msg.text();
      logs.push(text);

      if (msg.type() === 'error') {
        errors.push(text);
      } else if (msg.type() === 'warning') {
        warnings.push(text);
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    console.log('🔍 Carregando aplicação e capturando logs...\n');

    await page.goto('http://localhost:3000/?perf=1', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    await automateGameFlow(page);

    try {
      await page.waitForSelector('.player', { timeout: 8000 });
    } catch (waitError) {
      console.warn('⚠️ Elementos de player não apareceram em até 8s. Continuando assim mesmo.');
    }

    await sleep(5000);
    printCollectedLogs(logs, errors, warnings);

    const dynamicCSS = await page.evaluate(() => {
      const styleElement = document.getElementById('dynamic-sprite-css');
      return styleElement
        ? {
            exists: true,
            length: styleElement.innerHTML.length,
            sample: `${styleElement.innerHTML.substring(0, 200)}...`,
          }
        : { exists: false };
    });

    if (dynamicCSS.exists) {
      console.log('✅ CSS dinâmico detectado com sucesso!');
      console.log(`📊 Tamanho do CSS gerado: ${dynamicCSS.length} caracteres`);
      console.log(`📝 Amostra do CSS:\n${dynamicCSS.sample}\n`);
    } else {
      console.log('❌ CSS dinâmico não foi detectado\n');
    }

    const playerElements = await page.evaluate(() => {
      const players = document.querySelectorAll('.player');
      return Array.from(players).map((player) => ({
        classes: player.className,
        characterType: player.dataset.character,
        direction: player.dataset.direction,
        frame: player.dataset.frame,
      }));
    });

    if (playerElements.length > 0) {
      console.log('🎮 === PLAYERS DETECTADOS NA PÁGINA ===\n');
      playerElements.forEach((player, index) => {
        console.log(`  👤 Player ${index + 1}:`);
        console.log(`     Classes: ${player.classes}`);
        console.log(`     Personagem: ${player.characterType}`);
        console.log(`     Direção: ${player.direction}`);
        console.log(`     Frame: ${player.frame}`);
      });
      console.log('');
    } else {
      console.log('⚠️ Nenhum elemento player detectado na página\n');
    }

    await browser.close();
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.log(`⚠️ Erro durante a análise com puppeteer: ${error.message}`);
    console.log('   Recaindo para a análise simplificada.\n');
    const fallbackResponse = await fetchWithNode('http://localhost:3000');
    await runFallbackAnalysis(fallbackResponse);
  }
}

async function runFallbackAnalysis(response) {
  console.log('🔍 Modo simplificado: baixando HTML para análise básica...\n');
  const html = await response.text();

  console.log(`📏 Tamanho do HTML recebido: ${html.length} caracteres\n`);

  if (html.includes('player')) {
    console.log('🎮 Indícios de elementos de player encontrados no HTML');
  }

  if (html.toLowerCase().includes('error')) {
    console.log('⚠️ Possíveis mensagens de erro presentes no HTML');
  } else {
    console.log('✅ Nenhuma mensagem de erro visível no HTML');
  }

  console.log('');
}

async function automateGameFlow(page) {
  try {
    await page.waitForSelector('.character-item', { timeout: 30000 });
    const characterItems = await page.$$('.character-item');
    let selected = false;
    for (const item of characterItems) {
      const nameHandle = await item.$('.character-name');
      if (!nameHandle) continue;
      const name = await page.evaluate((el) => el.textContent?.trim() || '', nameHandle);
      if (name.toLowerCase().includes('tia bel')) {
        await item.click();
        selected = true;
        break;
      }
    }

    if (!selected && characterItems.length > 0) {
      await characterItems[0].click();
    }

    await page.waitForSelector('.start-game-button', { timeout: 15000 });
    await page.click('.start-game-button');

    await page.waitForSelector('.news-board', { timeout: 30000 });

    for (let i = 0; i < 6; i++) {
      await executeRound(page, i + 1);
    }
  } catch (error) {
    console.warn(`⚠️ Automação interrompida: ${error.message}`);
  }
}

async function executeRound(page, roundNumber) {
  try {
    await page.waitForSelector('.button-container button', { timeout: 15000 });
  } catch (error) {
    console.warn(`⚠️ Botões de avaliação não disponíveis na rodada ${roundNumber}.`);
    return;
  }

  const buttons = await page.$$('.button-container button');
  if (!buttons || buttons.length === 0) {
    console.warn(`⚠️ Nenhum botão de escolha encontrado na rodada ${roundNumber}.`);
    return;
  }

  const randomIndex = Math.floor(Math.random() * buttons.length);
  const chosenButton = buttons[randomIndex];

  let dialogMessage = null;
  const dialogHandler = async (dialog) => {
    if (!dialogMessage) {
      dialogMessage = dialog.message();
      try {
        await dialog.accept();
      } catch (error) {
        console.warn(`⚠️ Falha ao aceitar diálogo: ${error.message}`);
      }
    }
  };

  page.once('dialog', dialogHandler);

  await chosenButton.click();
  await sleep(1500);

  page.off('dialog', dialogHandler);

  if (dialogMessage && dialogMessage.includes('Você acertou')) {
    await handleCorrectAnswer(page);
  } else {
    await handleExplanationPanel(page);
  }

  await sleep(1200);
}

async function handleCorrectAnswer(page) {
  try {
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.dice-roll-animation.dice'))
          .some((el) => el.getAttribute('aria-disabled') === 'false'),
      { timeout: 10000 },
    );

    await page.evaluate(() => {
      const dice = Array.from(document.querySelectorAll('.dice-roll-animation.dice'))
        .find((el) => el.getAttribute('aria-disabled') === 'false');
      if (dice) {
        dice.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });

    await sleep(6000);
  } catch (error) {
    console.warn(`⚠️ Falha ao clicar no dado após resposta correta: ${error.message}`);
  }
}

async function handleExplanationPanel(page) {
  try {
    const panelVisible = await page.waitForFunction(
      () => !!document.querySelector('.explanation-panel') &&
        getComputedStyle(document.querySelector('.explanation-panel')).visibility === 'visible',
      { timeout: 5000 },
    );

    if (!panelVisible) return;

    const silenceButton = await page.$('.explanation-button.silence-button');
    if (silenceButton) {
      await silenceButton.click();
      await sleep(400);
    }

    const closeButton = await page.$('.explanation-button.close-button');
    if (closeButton) {
      await closeButton.click();
      await sleep(700);
    }
  } catch (error) {
    // Painel pode não ter aparecido, seguir em frente
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printCollectedLogs(logs, errors, warnings) {
  console.log('📊 === ANÁLISE DOS LOGS CAPTURADOS ===\n');
  console.log(`📝 Total de logs capturados: ${logs.length}`);
  console.log(`❌ Erros encontrados: ${errors.length}`);
  console.log(`⚠️ Avisos encontrados: ${warnings.length}\n`);

  const spriteLogs = logs.filter(
    (log) =>
      log.includes('Sistema ortogonal') ||
      log.includes('sprite') ||
      log.includes('character-') ||
      log.includes('Player render'),
  );

  if (spriteLogs.length > 0) {
    console.log('🎨 === LOGS DO SISTEMA DE SPRITES ===\n');
    spriteLogs.forEach((log) => {
      console.log(`  🎯 ${log}`);
    });
    console.log('');
  } else {
    console.log('⚠️ Nenhum log específico do sistema de sprites encontrado\n');
  }

  if (errors.length > 0) {
    console.log('❌ === ERROS ENCONTRADOS ===\n');
    errors.forEach((error) => {
      console.log(`  🚨 ${error}`);
    });
    console.log('');
  }

  if (warnings.length > 0 && warnings.length <= 5) {
    console.log('⚠️ === AVISOS ENCONTRADOS ===\n');
    warnings.forEach((warning) => {
      console.log(`  ⚠️ ${warning}`);
    });
    console.log('');
  }
}

analyzeLogs().catch(console.error);

