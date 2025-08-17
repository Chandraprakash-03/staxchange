import { describe, it, expect } from 'vitest';
import { ASTParser } from '@/utils/ast-parser';

describe('ASTParser', () => {
  describe('analyzeJavaScript', () => {
    it('should parse ES6 imports correctly', () => {
      const code = `
        import React from 'react';
        import { useState, useEffect } from 'react';
        import * as utils from './utils';
        import './styles.css';
      `;

      const result = ASTParser.analyzeJavaScript(code, 'test.js');

      expect(result.imports).toHaveLength(4);
      
      expect(result.imports[0]).toEqual({
        module: 'react',
        imports: ['React'],
        type: 'default',
        line: 2,
      });

      expect(result.imports[1]).toEqual({
        module: 'react',
        imports: ['useState', 'useEffect'],
        type: 'named',
        line: 3,
      });

      expect(result.imports[2]).toEqual({
        module: './utils',
        imports: ['utils'],
        type: 'namespace',
        line: 4,
      });

      expect(result.imports[3]).toEqual({
        module: './styles.css',
        imports: [],
        type: 'side-effect',
        line: 5,
      });
    });

    it('should parse CommonJS require statements', () => {
      const code = `
        const express = require('express');
        const { Router } = require('express');
        let fs = require('fs');
      `;

      const result = ASTParser.analyzeJavaScript(code, 'test.js');

      expect(result.imports).toHaveLength(3);
      
      expect(result.imports[0]).toEqual({
        module: 'express',
        imports: ['express'],
        type: 'default',
        line: 2,
      });

      expect(result.imports[1]).toEqual({
        module: 'express',
        imports: ['{ Router }'],
        type: 'default',
        line: 3,
      });
    });

    it('should parse function declarations', () => {
      const code = `
        function regularFunction(param1, param2) {
          return param1 + param2;
        }

        async function asyncFunction() {
          await something();
        }

        function* generatorFunction() {
          yield 1;
        }

        const arrowFunction = (a, b) => a + b;
        const asyncArrow = async () => await fetch('/api');
      `;

      const result = ASTParser.analyzeJavaScript(code, 'test.js');

      expect(result.functions).toHaveLength(5);
      
      expect(result.functions[0]).toEqual({
        name: 'regularFunction',
        parameters: ['param1', 'param2'],
        isAsync: false,
        isGenerator: false,
        line: 2,
        complexity: expect.any(Number),
      });

      expect(result.functions[1]).toEqual({
        name: 'asyncFunction',
        parameters: [],
        isAsync: true,
        isGenerator: false,
        line: 6,
        complexity: expect.any(Number),
      });

      expect(result.functions[2]).toEqual({
        name: 'generatorFunction',
        parameters: [],
        isAsync: false,
        isGenerator: true,
        line: 10,
        complexity: expect.any(Number),
      });

      expect(result.functions[3]).toEqual({
        name: 'arrowFunction',
        parameters: [],
        isAsync: false,
        isGenerator: false,
        line: 14,
        complexity: expect.any(Number),
      });

      expect(result.functions[4]).toEqual({
        name: 'asyncArrow',
        parameters: [],
        isAsync: true,
        isGenerator: false,
        line: 15,
        complexity: expect.any(Number),
      });
    });

    it('should parse class declarations', () => {
      const code = `
        class BaseClass {
          constructor(name) {
            this.name = name;
          }

          getName() {
            return this.name;
          }
        }

        class ExtendedClass extends BaseClass {
          async fetchData() {
            return await fetch('/api');
          }
        }

        export class ExportedClass implements SomeInterface {
          property = 'value';
          
          method() {
            return this.property;
          }
        }
      `;

      const result = ASTParser.analyzeJavaScript(code, 'test.js');

      expect(result.classes).toHaveLength(3);
      
      expect(result.classes[0]).toEqual({
        name: 'BaseClass',
        extends: undefined,
        implements: undefined,
        methods: expect.arrayContaining([
          expect.objectContaining({ name: 'constructor' }),
          expect.objectContaining({ name: 'getName' }),
        ]),
        properties: expect.any(Array),
        line: 2,
      });

      expect(result.classes[1]).toEqual({
        name: 'ExtendedClass',
        extends: 'BaseClass',
        implements: undefined,
        methods: expect.arrayContaining([
          expect.objectContaining({ name: 'fetchData', isAsync: true }),
        ]),
        properties: expect.any(Array),
        line: expect.any(Number),
      });

      expect(result.classes[2]).toEqual({
        name: 'ExportedClass',
        extends: undefined,
        implements: expect.any(Array),
        methods: expect.any(Array),
        properties: expect.any(Array),
        line: expect.any(Number),
      });
    });

    it('should parse variable declarations', () => {
      const code = `
        var oldVar = 'old';
        let newVar = 'new';
        const constant = 'constant';
        export const exportedConst = 'exported';
      `;

      const result = ASTParser.analyzeJavaScript(code, 'test.js');

      expect(result.variables).toHaveLength(4);
      
      expect(result.variables[0]).toEqual({
        name: 'oldVar',
        type: 'var',
        line: 2,
        isExported: false,
      });

      expect(result.variables[1]).toEqual({
        name: 'newVar',
        type: 'let',
        line: 3,
        isExported: false,
      });

      expect(result.variables[2]).toEqual({
        name: 'constant',
        type: 'const',
        line: 4,
        isExported: false,
      });

      expect(result.variables[3]).toEqual({
        name: 'exportedConst',
        type: 'const',
        line: 5,
        isExported: true,
      });
    });

    it('should parse export statements', () => {
      const code = `
        export default function DefaultFunction() {}
        export const namedExport = 'value';
        export { someVar, anotherVar };
        export class ExportedClass {}
        export function exportedFunction() {}
      `;

      const result = ASTParser.analyzeJavaScript(code, 'test.js');

      expect(result.exports).toHaveLength(6);
      
      expect(result.exports[0]).toEqual({
        name: 'default',
        type: 'function',
        line: 2,
      });

      expect(result.exports[1]).toEqual({
        name: 'namedExport',
        type: 'variable',
        line: 3,
      });

      expect(result.exports[2]).toEqual({
        name: 'someVar',
        type: 'named',
        line: 4,
      });

      expect(result.exports[3]).toEqual({
        name: 'anotherVar',
        type: 'named',
        line: 4,
      });

      expect(result.exports[4]).toEqual({
        name: 'ExportedClass',
        type: 'class',
        line: 5,
      });
    });

    it('should calculate complexity correctly', () => {
      const simpleCode = `
        function simple() {
          return 'hello';
        }
      `;

      const complexCode = `
        function complex(x) {
          if (x > 0) {
            for (let i = 0; i < x; i++) {
              if (i % 2 === 0) {
                console.log(i);
              } else if (i % 3 === 0) {
                console.log('fizz');
              }
            }
          } else {
            while (x < 0) {
              x++;
            }
          }
          return x > 10 ? 'big' : 'small';
        }
      `;

      const simpleResult = ASTParser.analyzeJavaScript(simpleCode, 'simple.js');
      const complexResult = ASTParser.analyzeJavaScript(complexCode, 'complex.js');

      expect(simpleResult.complexity).toBeLessThan(complexResult.complexity);
      expect(complexResult.complexity).toBeGreaterThan(5);
    });
  });

  describe('analyzePython', () => {
    it('should parse Python imports correctly', () => {
      const code = `
        import os
        import sys as system
        from datetime import datetime, timedelta
        from django.db import models
        from . import utils
        from ..parent import helper
      `;

      const result = ASTParser.analyzePython(code, 'test.py');

      expect(result.imports).toHaveLength(6);
      
      expect(result.imports[0]).toEqual({
        module: 'os',
        imports: ['os'],
        type: 'default',
        line: 2,
      });

      expect(result.imports[1]).toEqual({
        module: 'sys',
        imports: ['system'],
        type: 'default',
        line: 3,
      });

      expect(result.imports[2]).toEqual({
        module: 'datetime',
        imports: ['datetime', 'timedelta'],
        type: 'named',
        line: 4,
      });

      expect(result.imports[3]).toEqual({
        module: 'django.db',
        imports: ['models'],
        type: 'named',
        line: 5,
      });
    });

    it('should parse Python function definitions', () => {
      const code = `
        def regular_function(param1, param2):
            return param1 + param2

        async def async_function():
            await some_operation()

        def function_with_defaults(a, b=10, c='default'):
            return a + b + len(c)
      `;

      const result = ASTParser.analyzePython(code, 'test.py');

      expect(result.functions).toHaveLength(3);
      
      expect(result.functions[0]).toEqual({
        name: 'regular_function',
        parameters: ['param1', 'param2'],
        isAsync: false,
        isGenerator: false,
        line: 2,
        complexity: expect.any(Number),
      });

      expect(result.functions[1]).toEqual({
        name: 'async_function',
        parameters: [],
        isAsync: true,
        isGenerator: false,
        line: 5,
        complexity: expect.any(Number),
      });

      expect(result.functions[2]).toEqual({
        name: 'function_with_defaults',
        parameters: ['a', 'b=10', "c='default'"],
        isAsync: false,
        isGenerator: false,
        line: 8,
        complexity: expect.any(Number),
      });
    });

    it('should parse Python class definitions', () => {
      const code = `
        class BaseModel:
            def __init__(self, name):
                self.name = name

            def get_name(self):
                return self.name

        class User(BaseModel):
            def __init__(self, name, email):
                super().__init__(name)
                self.email = email

            async def save(self):
                await database.save(self)

        class AdminUser(User, AdminMixin):
            def delete_user(self, user_id):
                return database.delete(user_id)
      `;

      const result = ASTParser.analyzePython(code, 'test.py');

      expect(result.classes).toHaveLength(3);
      
      expect(result.classes[0]).toEqual({
        name: 'BaseModel',
        extends: undefined,
        implements: undefined,
        methods: expect.any(Array),
        properties: [],
        line: 2,
      });

      expect(result.classes[1]).toEqual({
        name: 'User',
        extends: 'BaseModel',
        implements: expect.any(Array),
        methods: expect.any(Array),
        properties: [],
        line: expect.any(Number),
      });

      expect(result.classes[2]).toEqual({
        name: 'AdminUser',
        extends: 'User',
        implements: expect.any(Array),
        methods: expect.any(Array),
        properties: [],
        line: expect.any(Number),
      });
    });

    it('should calculate Python complexity correctly', () => {
      const simpleCode = `
        def simple():
            return "hello"
      `;

      const complexCode = `
        def complex(x):
            if x > 0:
                for i in range(x):
                    if i % 2 == 0:
                        print(i)
                    elif i % 3 == 0:
                        print('fizz')
            else:
                while x < 0:
                    x += 1
            return 'big' if x > 10 else 'small'
      `;

      const simpleResult = ASTParser.analyzePython(simpleCode, 'simple.py');
      const complexResult = ASTParser.analyzePython(complexCode, 'complex.py');

      expect(simpleResult.complexity).toBeLessThan(complexResult.complexity);
      expect(complexResult.complexity).toBeGreaterThan(5);
    });
  });

  describe('edge cases', () => {
    it('should handle empty code', () => {
      const result = ASTParser.analyzeJavaScript('', 'empty.js');
      
      expect(result.imports).toHaveLength(0);
      expect(result.exports).toHaveLength(0);
      expect(result.functions).toHaveLength(0);
      expect(result.classes).toHaveLength(0);
      expect(result.variables).toHaveLength(0);
      expect(result.complexity).toBe(1);
      expect(result.linesOfCode).toBe(1);
    });

    it('should handle malformed code gracefully', () => {
      const malformedCode = `
        import { unclosed from 'module
        function incomplete(
        class MissingBrace {
          method() {
      `;

      expect(() => {
        ASTParser.analyzeJavaScript(malformedCode, 'malformed.js');
      }).not.toThrow();
    });

    it('should handle comments and whitespace', () => {
      const codeWithComments = `
        // This is a comment
        /* Multi-line
           comment */
        import React from 'react'; // Inline comment
        
        /**
         * JSDoc comment
         */
        function documented() {
          // Another comment
          return 'value';
        }
      `;

      const result = ASTParser.analyzeJavaScript(codeWithComments, 'commented.js');
      
      expect(result.imports).toHaveLength(1);
      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe('documented');
    });
  });
});